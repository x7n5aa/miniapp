/* منطق الواجهة الصافي (بلا DOM) - مفصول ليُختبر بـ Node. */
(function (root) {
  'use strict';

  function toMinutes(hhmm) {
    var p = String(hhmm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }

  /** الوقت الحالي بدقائق اليوم حسب ساعة الخادم (بالمنطقة الزمنية المضبوطة) + الزمن المنقضي منذ الجلب. */
  function currentMinutes(now, elapsedMs) {
    var total = now.minutes * 60 + (now.seconds || 0) + (elapsedMs || 0) / 1000;
    return Math.min(total / 60, 1439.99);   // بعد منتصف الليل تصحّحه إعادة الجلب الدورية
  }

  function lectureStatus(lec, nowMin) {
    if (nowMin < toMinutes(lec.start)) return 'upcoming';
    if (nowMin < toMinutes(lec.end)) return 'ongoing';
    return 'finished';
  }

  /**
   * حالة شريحة اليوم. اليوم "النشط" (توهج) = يوم فيه محاضرات فعلية ومحدد حالياً.
   * ctx: {selectedId, todayId, todayHasClasses, nextId}
   */
  function dayChipState(day, ctx) {
    var study = day.lecture_count > 0;
    var selected = day.id === ctx.selectedId;
    var today = day.id === ctx.todayId;
    var next = day.id === ctx.nextId && !ctx.todayHasClasses;
    var badge = null;
    if (today && study) badge = { kind: 'today', text: 'دوام اليوم' };
    else if (today) badge = { kind: 'today-off', text: 'اليوم · لا دوام' };
    else if (next) badge = { kind: 'next', text: 'الدوام القادم' };
    else if (!study) badge = { kind: 'off', text: 'لا دوام' };
    var cls = 'day ' + (study ? 'is-study' : 'is-off');
    if (selected) cls += ' is-selected';
    if (selected && study) cls += ' is-glow';
    if (today) cls += ' is-today';
    if (next) cls += ' is-next';
    return { study: study, selected: selected, today: today, next: next, glow: selected && study, badge: badge, className: cls };
  }

  /** تاريخ كل يوم أسبوع ضمن الأسبوع الحالي (يبدأ السبت). weekday بترقيم بايثون (الاثنين=0). */
  function weekDates(isoLocal, weekdayPy) {
    var y = parseInt(isoLocal.slice(0, 4), 10), m = parseInt(isoLocal.slice(5, 7), 10) - 1, d = parseInt(isoLocal.slice(8, 10), 10);
    var base = Date.UTC(y, m, d);
    var back = (weekdayPy - 5 + 7) % 7;
    var start = base - back * 86400000;
    var out = {};
    for (var py = 0; py < 7; py++) {
      var dt = new Date(start + ((py - 5 + 7) % 7) * 86400000);
      out[py] = { day: dt.getUTCDate(), month: dt.getUTCMonth() };
    }
    return out;
  }

  /** يسمح بروابط http/https فقط (يمنع javascript: وما شابه). */
  function safeUrl(u) {
    var s = String(u || '').trim();
    if (!s) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
    try {
      var url = new URL(s);
      return (url.protocol === 'https:' || url.protocol === 'http:') ? url.href : null;
    } catch (e) { return null; }
  }

  /** '13:05' -> {num:'1:05', per:'م'} ؛ '00:30' -> {num:'12:30', per:'ص'} (التخزين والـ API بنظام 24 ساعة، العرض 12). */
  function fmt12(hhmm) {
    var h = parseInt(String(hhmm).slice(0, 2), 10), m = String(hhmm).slice(3, 5);
    return { num: ((h % 12) || 12) + ':' + m, per: h < 12 ? 'ص' : 'م' };
  }
  function fmt12str(hhmm) { var f = fmt12(hhmm); return f.num + ' ' + f.per; }

  var api = { fmt12: fmt12, fmt12str: fmt12str, toMinutes: toMinutes, currentMinutes: currentMinutes, lectureStatus: lectureStatus,
              dayChipState: dayChipState, weekDates: weekDates, safeUrl: safeUrl };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TTLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);

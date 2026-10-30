/* تطبيق الطالب (Telegram Mini App). كل بيانات القاعدة تُعرض عبر textContent فقط (لا innerHTML). */
(function () {
  'use strict';
  var L = window.TTLogic;
  var tg = window.Telegram && window.Telegram.WebApp;
  var view = document.getElementById('view');
  var nav = document.getElementById('nav');
  var toastEl = document.getElementById('toast');

  // ---------- أدوات DOM ----------
  var ICONS = {
    home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
    book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM6.5 17H20v4H6.5A2.5 2.5 0 0 1 4 19.5',
    calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
    chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    pin: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    check: 'M5 12l5 5L20 7', x: 'M6 6l12 12M18 6L6 18',
    target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
    alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    chev: 'M9 6l6 6-6 6'
  };
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONS[name] || ''); s.appendChild(p);
    return s;
  }
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function bdi(text) { return h('bdi', { text: String(text) }); }
  function time12(hhmm) { var f = L.fmt12(hhmm); return h('span', { class: 't12' }, bdi(f.num), ' ' + f.per); }
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString('ar-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return String(iso).slice(0, 10); }
  }
  var MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  // ---------- الاتصال بالـ API ----------
  function ApiError(status, code, message) { this.status = status; this.code = code; this.message = message; }
  function authHeader() { return { 'Authorization': 'tma ' + ((tg && tg.initData) || '') }; }
  function api(path, opts) {
    opts = opts || {};
    var headers = authHeader();
    if (opts.body) headers['Content-Type'] = 'application/json';
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    return fetch(path, { method: opts.method || 'GET', headers: headers, cache: 'no-store', signal: ctl ? ctl.signal : undefined, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .catch(function () { throw new ApiError(0, 'network', 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم أعد المحاولة.'); })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        return res.json().catch(function () { return null; }).then(function (data) {
          if (!res.ok) throw new ApiError(res.status, data && data.error, (data && data.message) || 'حدث خطأ غير متوقع');
          return data;
        });
      });
  }
  function apiBlob(path) {
    return fetch(path, { headers: authHeader(), cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new ApiError(res.status, 'file', 'تعذّر تحميل الملف');
      return res.blob();
    });
  }

  // ---------- حالات عامة ----------
  function loadingView(n) {
    var box = h('div', { class: 'stack', 'aria-busy': 'true' });
    for (var i = 0; i < (n || 3); i++) box.appendChild(h('div', { class: 'skeleton' }));
    return box;
  }
  function errorView(err, retry) {
    var msg = err && err.message ? err.message : 'حدث خطأ';
    return h('div', { class: 'state card' }, h('span', { class: 'big' }, '⚠️'), h('p', { text: msg }),
      retry ? h('button', { class: 'btn soft', onclick: retry }, icon('refresh'), 'إعادة المحاولة') : null);
  }
  function emptyView(emoji, text, sub) {
    return h('div', { class: 'state' }, h('span', { class: 'big' }, emoji), h('div', { text: text }), sub ? h('div', { class: 'small', text: sub }) : null);
  }
  function setView() { view.replaceChildren.apply(view, arguments); window.scrollTo(0, 0); }
  function guard(fn) {   // يحوّل أي فشل لعرض خطأ مع زر إعادة
    return function () {
      var args = arguments;
      var run = function () {
        setView(loadingView());
        return Promise.resolve().then(function () { return fn.apply(null, args); }).catch(function (e) {
          if (!(e instanceof ApiError)) e = new ApiError(0, 'client', 'حدث خطأ غير متوقع في عرض الصفحة. أعد المحاولة.');   // لا نعرض أخطاء جافاسكربت الخام
          setView(errorView(e, run));
        });
      };
      return run();
    };
  }

  // ---------- الراوتر ----------
  var cleanup = null;
  var TOP = { home: 'home', subjects: 'subjects', timetable: 'timetable', results: 'results', announcements: 'announcements' };
  var NAV = [['home', 'الرئيسية', 'home'], ['subjects', 'المواد', 'book'], ['timetable', 'الجدول', 'calendar'], ['results', 'نتائجي', 'chart'], ['announcements', 'الإعلانات', 'bell']];
  function buildNav() {
    nav.replaceChildren.apply(nav, NAV.map(function (n) { return h('a', { href: '#' + n[0], 'data-tab': n[0] }, icon(n[2]), n[1]); }));
  }
  function markNav(tab) {
    Array.prototype.forEach.call(nav.children, function (a) {
      if (a.getAttribute('data-tab') === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function route() {
    if (cleanup) { try { cleanup(); } catch (e) { /* تجاهل */ } cleanup = null; }
    var hash = (location.hash || '').replace(/^#/, '');
    if (/^tgWebApp/.test(hash)) hash = '';            // تليغرام يمرّر بارامترات الإطلاق في الـ hash
    if (!hash) {
      var tab = new URLSearchParams(location.search).get('tab');
      hash = TOP[tab] ? tab : 'home';
    }
    var p = hash.split('/');
    var name = p[0] || 'home';
    var tab = name;
    if (name === 'subject' || name === 'lecture' || name === 'quiz') tab = 'subjects';
    if (name === 'result') tab = 'results';
    markNav(TOP[tab] ? tab : 'home');
    if (tg && tg.BackButton) { if (TOP[name]) tg.BackButton.hide(); else tg.BackButton.show(); }
    var id = parseInt(p[1], 10);
    switch (name) {
      case 'home': case '': return guard(homeView)();
      case 'subjects': return guard(subjectsView)();
      case 'subject': return guard(subjectView)(id);
      case 'lecture': return guard(lectureView)(id, p[2] === 'summary' ? 'summary' : 'lecture');
      case 'quiz': return guard(quizView)(id);
      case 'results': return guard(resultsView)();
      case 'result': return guard(resultDetailView)(id);
      case 'announcements': return guard(announcementsView)();
      case 'timetable': return timetableView();
      default: location.hash = '#home';
    }
  }
  function go(hash) { location.hash = hash; }

  // ---------- الرئيسية ----------
  function homeView() {
    return Promise.all([api('/api/home'), api('/api/timetable').catch(function () { return null; })]).then(function (r) {
      var d = r[0], tt = r[1];
      var cards = [['subjects', 'book', 'المواد والمحاضرات', d.subjects_count + ' مادة'], ['subjects', 'target', 'الاختبارات الإلكترونية', d.questions_count + ' سؤال'],
        ['timetable', 'calendar', 'الجدول الدراسي', null], ['results', 'chart', 'النتائج والمحاولات', null]];
      var el = h('div', { class: 'stack' },
        h('div', { class: 'page-title' }, h('div', null, h('h1', { text: 'هلا ' + (d.name || '') + ' 👋' }),
          h('div', { class: 'muted small', text: d.group ? 'كروبك: ' + d.group.name : 'لم يحدد الأدمن كروبك بعد' }))),
        todayCard(tt),
        h('div', { class: 'grid2' }, cards.map(function (c) {
          return h('a', { class: 'card link-card', href: '#' + c[0] }, h('span', { class: 'ico' }, icon(c[1])),
            h('div', { class: 'grow' }, h('div', { text: c[2] }), c[3] ? h('div', { class: 'muted small', text: c[3] }) : null));
        })),
        h('div', { class: 'row' }, h('h2', { class: 'grow', text: 'آخر الإعلانات' }), h('a', { href: '#announcements', class: 'small', text: 'عرض الكل' })),
        d.announcements.length ? d.announcements.map(announcementCard) : emptyView('📭', 'لا توجد إعلانات حالياً'));
      setView(el);
    });
  }
  function todayCard(tt) {
    if (!tt || !tt.timetable || !tt.states) return null;
    var s = tt.states, byId = {};
    tt.days.forEach(function (d) { byId[d.id] = d; });
    var text, sub;
    if (s.today_has_classes) {
      var day = byId[s.today_day_id];
      text = 'دوام اليوم: ' + day.lecture_count + ' محاضرة'; sub = 'أول محاضرة ' + L.fmt12str(day.lectures[0].start);
    } else if (s.next_day_id) {
      var nd = byId[s.next_day_id];
      text = 'لا دوام اليوم'; sub = 'الدوام القادم: ' + nd.label;
    } else return null;
    return h('a', { class: 'card link-card', href: '#timetable' }, h('span', { class: 'ico' }, icon('clock')),
      h('div', { class: 'grow' }, h('div', { text: text }), h('div', { class: 'muted small' }, sub)), h('span', { class: 'chev' }, icon('chev')));
  }
  function announcementCard(a) {
    return h('div', { class: 'card' }, h('div', { class: 'muted small', text: fmtDate(a.created_at) }), h('div', { class: 'pre user-text', dir: 'auto', text: a.text }));
  }
  function announcementsView() {
    return api('/api/announcements').then(function (d) {
      setView(h('div', { class: 'stack' }, h('div', { class: 'page-title' }, h('h1', { text: 'الإعلانات' })),
        d.announcements.length ? d.announcements.map(announcementCard) : emptyView('📭', 'لا توجد إعلانات حالياً')));
    });
  }

  // ---------- المواد والمحاضرات ----------
  function subjectsView() {
    return api('/api/subjects').then(function (d) {
      setView(h('div', { class: 'stack' }, h('div', { class: 'page-title' }, h('h1', { text: 'المواد الدراسية' })),
        d.subjects.length ? d.subjects.map(function (s) {
          return h('a', { class: 'card link-card', href: '#subject/' + s.id }, h('span', { class: 'ico' }, icon('book')),
            h('div', { class: 'grow' }, h('div', { class: 'user-text', dir: 'auto', text: s.name }),
              h('div', { class: 'muted small', text: s.lectures_count + ' محاضرة · ' + s.questions_count + ' سؤال' })), h('span', { class: 'chev' }, icon('chev')));
        }) : emptyView('📚', 'لا توجد مواد متاحة بعد')));
    });
  }
  var quizCache = {};
  function startQuiz(body) {
    return api('/api/quiz/start', { method: 'POST', body: body }).then(function (d) { quizCache[d.attempt_id] = d; go('#quiz/' + d.attempt_id); })
      .catch(function (e) { toast(e.message); });
  }
  function subjectView(id) {
    return Promise.all([api('/api/subjects/' + id + '/lectures'), api('/api/quiz/options?subject_id=' + id)]).then(function (r) {
      var d = r[0], o = r[1];
      var bank = [];
      if (o.total) {
        bank.push(h('button', { class: 'btn soft', onclick: function () { startQuiz({ mode: 'quick20', subject_id: id }); } }, '⚡ اختبار سريع (20)'));
        if (o.important) bank.push(h('button', { class: 'btn soft', onclick: function () { startQuiz({ mode: 'important', subject_id: id }); } }, '⭐ الأسئلة المهمة (' + o.important + ')'));
        o.sections.forEach(function (s) {
          bank.push(h('button', { class: 'btn', onclick: function () { startQuiz({ mode: 'section', subject_id: id, section: s.n }); } }, 'قسم ' + s.n + ' (' + s.start + '–' + s.end + ')'));
        });
      }
      if (o.wrong) bank.push(h('button', { class: 'btn', onclick: function () { startQuiz({ mode: 'wrong', subject_id: id }); } }, '❌ أخطائي (' + o.wrong + ')'));
      setView(h('div', { class: 'stack' },
        h('div', { class: 'page-title' }, h('h1', { class: 'user-text', dir: 'auto', text: d.subject.name })),
        h('h2', { text: 'المحاضرات' }),
        d.lectures.length ? d.lectures.map(function (l) {
          return h('div', { class: 'card stack' }, h('div', { class: 'user-text', dir: 'auto', text: l.name }),
            h('div', { class: 'row wrap' },
              h('a', { class: 'btn soft', href: '#lecture/' + l.id }, icon('file'), 'المحاضرة (' + l.lecture_items + ')'),
              h('a', { class: 'btn soft', href: '#lecture/' + l.id + '/summary' }, icon('book'), 'الملخص (' + l.summary_items + ')'),
              l.questions_count ? h('button', { class: 'btn', onclick: function () { startQuiz({ mode: 'lecture', lecture_id: l.id }); } }, icon('target'), 'اختبر نفسك (' + l.questions_count + ')') : null));
        }) : emptyView('📖', 'لا توجد محاضرات'),
        bank.length ? [h('h2', { text: 'بنك الأسئلة' }), h('div', { class: 'card row wrap' }, bank)] : null));
    });
  }
  function lectureView(id, kind) {
    return api('/api/lectures/' + id + '/content?kind=' + kind).then(function (d) {
      var items = d.items.map(contentItem);
      setView(h('div', { class: 'stack' },
        h('div', { class: 'page-title' }, h('h1', { class: 'user-text', dir: 'auto', text: d.lecture.name })),
        h('div', { class: 'row' },
          h('a', { class: 'btn grow ' + (kind === 'lecture' ? 'primary' : 'soft'), href: '#lecture/' + id, text: 'المحاضرة' }),
          h('a', { class: 'btn grow ' + (kind === 'summary' ? 'primary' : 'soft'), href: '#lecture/' + id + '/summary', text: 'الملخص' })),
        items.length ? items : emptyView('🗂️', 'لا يوجد محتوى منشور هنا بعد'),
        h('button', { class: 'btn primary block', onclick: function () { startQuiz({ mode: 'lecture', lecture_id: id }); } }, icon('target'), 'اختبر نفسك على هذه المحاضرة')));
    });
  }
  function sendToChat(cid) {
    return api('/api/content/' + cid + '/send', { method: 'POST', body: {} }).then(function () { toast('✅ أُرسل الملف إلى محادثة البوت'); }).catch(function (e) { toast(e.message); });
  }
  function contentItem(it) {
    if (it.type === 'text') return h('div', { class: 'card pre user-text', dir: 'auto', text: it.value });
    if (it.type === 'link') {
      var url = L.safeUrl(it.value);
      if (!url) return h('div', { class: 'card pre user-text', dir: 'auto', text: it.value });
      return h('button', { class: 'card link-card btn block', onclick: function () { if (tg && tg.openLink) tg.openLink(url); else window.open(url, '_blank', 'noopener'); } },
        icon('link'), h('span', { class: 'grow ltr', text: it.value }));
    }
    if (it.type === 'image') {
      var img = h('img', { class: 'content-img', alt: it.file_name || 'صورة', loading: 'lazy' });
      apiBlob('/api/content/' + it.id + '/file').then(function (b) { img.src = URL.createObjectURL(b); }).catch(function () { img.alt = 'تعذّر تحميل الصورة'; });
      return h('div', { class: 'card stack' }, img, h('button', { class: 'btn soft block', onclick: function () { sendToChat(it.id); } }, 'إرسال الصورة لمحادثة البوت'));
    }
    return h('div', { class: 'card link-card' }, h('span', { class: 'ico' }, icon('file')), h('div', { class: 'grow user-text', dir: 'auto', text: it.file_name || 'ملف PDF' }),
      h('button', { class: 'btn soft', onclick: function () { sendToChat(it.id); } }, 'إرسال للمحادثة'));
  }

  // ---------- الاختبار ----------
  function quizView(attemptId) {
    var cached = quizCache[attemptId]; delete quizCache[attemptId];
    return (cached ? Promise.resolve(cached) : api('/api/quiz/' + attemptId)).then(function (data) {
      var optEls = [];
      var st = { qs: data.questions, i: 0, finished: data.finished };
      var firstOpen = st.qs.findIndex(function (q) { return q.chosen_index == null; });
      st.i = firstOpen < 0 ? 0 : firstOpen;
      if (st.finished) return api('/api/quiz/' + attemptId + '/finish', { method: 'POST', body: {} }).then(function (r) { setView(resultSummary(r, true)); });
      paint(); function swap(el) { view.replaceChildren(el); }
      function paint() {
        var q = st.qs[st.i], answered = st.qs.filter(function (x) { return x.chosen_index != null; }).length;
        var opts = q.options.map(function (text, idx) {
          var cls = 'opt', mark = String.fromCharCode(0x41 + idx);
          if (q.chosen_index != null) {
            if (idx === q.correct_index) { cls += ' is-correct'; mark = '✓'; }
            else if (idx === q.chosen_index) { cls += ' is-wrong'; mark = '✗'; }
          }
          return h('button', { class: cls, disabled: q.chosen_index != null, onclick: function () { choose(q, idx); } },
            h('span', { class: 'mark', text: mark }), h('span', { class: 'grow user-text', dir: 'auto', text: text }));
        });
        optEls = opts;
        var last = st.i === st.qs.length - 1;
        swap(h('div', { class: 'stack' },
          h('div', { class: 'row' }, h('div', { class: 'grow muted small', text: 'السؤال ' + (st.i + 1) + ' من ' + st.qs.length }), h('span', { class: 'chip', text: 'أُجيب ' + answered })),
          h('div', { class: 'progress', role: 'progressbar', 'aria-valuenow': answered, 'aria-valuemax': st.qs.length }, h('i', {})),
          h('div', { class: 'card pre user-text', dir: 'auto', text: q.question }),
          h('div', null, opts),
          q.chosen_index != null ? h('div', { class: 'chip ' + (q.is_correct ? 'ok' : 'bad'), text: q.is_correct ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة' }) : null,
          h('div', { class: 'row' },
            h('button', { class: 'btn grow', disabled: st.i === 0, onclick: function () { st.i--; paint(); window.scrollTo(0, 0); } }, 'السابق'),
            last ? h('button', { class: 'btn primary grow', onclick: finish }, 'إنهاء الاختبار')
                 : h('button', { class: 'btn primary grow', onclick: function () { st.i++; paint(); window.scrollTo(0, 0); } }, 'التالي'))));
        var bar = view.querySelector('.progress > i'); if (bar) bar.style.setProperty('width', Math.round(answered / st.qs.length * 100) + '%');
      }
      function choose(q, idx) {
        if (q.pending != null || q.chosen_index != null) return;
        // تأكيد فوري عند اللمس (قبل رد الخادم): نثبّت الاختيار ونمنع اللمس المزدوج. التصحيح يبقى على الخادم فقط.
        q.pending = idx;
        optEls.forEach(function (b) { b.setAttribute('disabled', ''); });
        if (optEls[idx]) optEls[idx].classList.add('is-pending');
        if (tg && tg.HapticFeedback) { try { tg.HapticFeedback.selectionChanged(); } catch (e) { /* */ } }
        function send(retry) {   // إعادة محاولة واحدة لو انقطعت الشبكة لحظياً (والتكرار الفعلي يحميه قفل الخادم 409)
          return api('/api/quiz/' + attemptId + '/answer', { method: 'POST', body: { question_id: q.id, chosen_index: idx } }).catch(function (e) {
            if (e.status === 0 && retry) return new Promise(function (r) { setTimeout(r, 400); }).then(function () { return send(false); });
            throw e;
          });
        }
        send(true).then(function (r) {
          q.pending = null; q.chosen_index = r.chosen_index; q.correct_index = r.correct_index; q.is_correct = r.is_correct;
          if (tg && tg.HapticFeedback) { try { tg.HapticFeedback.notificationOccurred(r.is_correct ? 'success' : 'error'); } catch (e) { /* */ } }
          paint();
        }).catch(function (e) {
          q.pending = null;
          if (e.status === 409) { api('/api/quiz/' + attemptId).then(function (d) { st.qs = d.questions; paint(); }); return; }
          toast(e.message); paint();
        });
      }
      function finish() {
        var open = st.qs.filter(function (x) { return x.chosen_index == null; }).length;
        if (open && !window.confirm('باقي ' + open + ' سؤال بدون إجابة. تنهي الاختبار؟')) return;
        api('/api/quiz/' + attemptId + '/finish', { method: 'POST', body: {} }).then(function (r) { setView(resultSummary(r, true)); }).catch(function (e) { toast(e.message); });
      }
    });
  }
  function resultSummary(r, withBack) {
    return h('div', { class: 'stack' },
      h('div', { class: 'card stack' }, h('div', { class: 'score-ring' }, bdi(r.percent + '%')),
        h('div', { class: 'row wrap' }, h('span', { class: 'chip ok', text: '✓ صحيحة ' + r.correct }), h('span', { class: 'chip bad', text: '✗ خاطئة ' + r.wrong }),
          r.unanswered ? h('span', { class: 'chip warn', text: 'بلا إجابة ' + r.unanswered }) : null)),
      h('h2', { text: 'مراجعة الإجابات' }), reviewList(r.review),
      withBack ? h('a', { class: 'btn primary block', href: '#results', text: 'نتائجي' }) : null);
  }
  function reviewList(items) {
    return h('div', null, items.map(function (q, n) {
      var status = q.chosen_index == null ? ['warn', 'بلا إجابة'] : (q.is_correct ? ['ok', '✓ صحيحة'] : ['bad', '✗ خاطئة']);
      return h('details', { class: 'review' },
        h('summary', null, h('span', { class: 'chip ' + status[0], text: status[1] }), h('span', { class: 'grow user-text', dir: 'auto', text: (n + 1) + '. ' + q.question })),
        h('div', { class: 'stack' }, q.options.map(function (t, i) {
          var cls = 'opt', mark = String.fromCharCode(0x41 + i);
          if (i === q.correct_index) { cls += ' is-correct'; mark = '✓'; } else if (i === q.chosen_index) { cls += ' is-wrong'; mark = '✗'; }
          return h('div', { class: cls }, h('span', { class: 'mark', text: mark }), h('span', { class: 'grow user-text', dir: 'auto', text: t }));
        })));
    }));
  }

  // ---------- النتائج ----------
  var MODE_LABELS = { lecture: 'محاضرة', quick20: 'اختبار سريع', bank100: 'بنك 100', important: 'الأسئلة المهمة', wrong_only: 'أخطائي', daily: 'يومي' };
  function modeLabel(m) { var s = /^section(\d+)$/.exec(m); return s ? 'قسم ' + s[1] : (MODE_LABELS[m] || m); }
  function resultsView() {
    return api('/api/results').then(function (d) {
      setView(h('div', { class: 'stack' }, h('div', { class: 'page-title' }, h('h1', { text: 'نتائجي' })),
        h('div', { class: 'grid2' },
          h('div', { class: 'card stat' }, h('b', null, bdi(d.attempts_count)), h('span', { class: 'muted small', text: 'محاولة' })),
          h('div', { class: 'card stat' }, h('b', null, bdi(d.average + '%')), h('span', { class: 'muted small', text: 'المعدل' })),
          h('div', { class: 'card stat' }, h('b', null, bdi(d.best + '%')), h('span', { class: 'muted small', text: 'أفضل نتيجة' })),
          h('div', { class: 'card stat' }, h('b', null, bdi(d.answered_total)), h('span', { class: 'muted small', text: 'سؤال أُجيب' }))),
        d.weak.length ? [h('h2', { text: 'نقاط تحتاج مراجعة' }), d.weak.map(function (w) {
          return h('div', { class: 'card row' }, h('div', { class: 'grow user-text', dir: 'auto', text: w.lecture_name + ' — ' + w.subject_name }), h('span', { class: 'chip bad', text: w.wrong_count + ' خطأ' }));
        })] : null,
        h('h2', { text: 'آخر المحاولات' }),
        d.recent.length ? d.recent.map(function (a) {
          var tag = a.has_details ? 'a' : 'div', props = { class: 'card row link-card' };
          if (a.has_details) props.href = '#result/' + a.attempt_id;
          return h(tag, props, h('div', { class: 'grow' }, h('div', { class: 'user-text', dir: 'auto', text: (a.subject || '—') + (a.lecture ? ' · ' + a.lecture : '') }),
            h('div', { class: 'muted small', text: modeLabel(a.mode) + ' · ' + fmtDate(a.finished_at) })),
            h('span', { class: 'chip ' + (a.percent >= 50 ? 'ok' : 'bad') }, bdi(a.percent + '%')), a.has_details ? h('span', { class: 'chev' }, icon('chev')) : null);
        }) : emptyView('📝', 'لم تُكمل أي اختبار بعد')));
    });
  }
  function resultDetailView(id) {
    return api('/api/results/' + id).then(function (r) { setView(h('div', { class: 'stack' }, h('div', { class: 'page-title' }, h('h1', { text: 'تفاصيل المحاولة' })), resultSummary(r, false))); });
  }

  // ---------- الجدول الدراسي ----------
  function timetableView() {
    var S = { data: null, perf0: 0, groupId: null, selectedId: null, userPicked: false, stale: false, lastOk: null, fatal: null, loading: true };
    var root = h('div', { class: 'tt stack' });
    setView(root);
    var chips = {}; var timers = [];

    function load() {
      var q = S.groupId ? '?group_id=' + S.groupId : '';
      return api('/api/timetable' + q).then(function (d) {
        S.data = d; S.perf0 = performance.now(); S.stale = false; S.fatal = null; S.lastOk = new Date();
        if (S.groupId == null) S.groupId = d.selected_group_id;
        var ids = d.days.map(function (x) { return x.id; });
        if (!S.userPicked || ids.indexOf(S.selectedId) < 0) S.selectedId = d.states ? d.states.default_day_id : null;
      }).catch(function (e) {
        if (!(e instanceof ApiError)) e = new ApiError(0, 'client', 'حدث خطأ غير متوقع في عرض الجدول. أعد المحاولة.');
        if (S.data) { S.stale = true; S.err = e; } else S.fatal = e;
      }).then(function () { S.loading = false; paint(); });
    }
    function nowMin() { return L.currentMinutes(S.data.now, performance.now() - S.perf0); }
    function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

    function paint() {
      chips = {};
      if (S.loading) { root.replaceChildren(loadingView(4)); return; }
      if (S.fatal) { root.replaceChildren(errorView(S.fatal, function () { S.loading = true; paint(); load(); })); return; }
      var d = S.data, parts = [];
      parts.push(h('div', { class: 'tt-head row' }, h('div', { class: 'grow' }, h('h1', { text: 'الجدول الدراسي' }),
        d.timetable ? h('div', { class: 'muted small user-text', dir: 'auto', text: d.timetable.name }) : null),
        h('button', { class: 'btn soft', 'aria-label': 'تحديث', onclick: function () { load().then(function () { if (!S.stale) toast('تم التحديث'); }); } }, icon('refresh'))));
      if (S.stale) parts.push(h('div', { class: 'banner err', role: 'alert' }, icon('alert'),
        h('div', null, 'تعذّر تحديث الجدول، والبيانات المعروضة قد تكون قديمة (آخر تحديث ناجح ' + (S.lastOk ? hhmm(S.lastOk) : '—') + '). ', h('a', { href: '#timetable', onclick: function (e) { e.preventDefault(); load(); }, text: 'إعادة المحاولة' }))));
      if (!d.groups.length) { parts.push(emptyView('👥', 'لا توجد كروبات مفعّلة', 'تواصل مع الأدمن')); root.replaceChildren.apply(root, parts); return; }
      if (d.groups.length > 1 || d.my_group_id == null) {
        parts.push(h('div', { class: 'group-bar', role: 'group', 'aria-label': 'اختيار الكروب' }, d.groups.map(function (g) {
          return h('button', { class: 'group-chip', 'aria-pressed': String(g.id === d.selected_group_id), onclick: function () {
            if (g.id === S.groupId) return; S.groupId = g.id; S.userPicked = false; S.loading = true; paint(); load(); } },
            g.name + (g.id === d.my_group_id ? ' ★' : ''));
        })));
      }
      if (d.my_group_id == null) parts.push(h('div', { class: 'banner' }, icon('alert'), h('div', { text: 'لم يحدد الأدمن كروبك بعد، لذلك تشاهد جدول أحد الكروبات. اختر كروبك من الأعلى.' })));
      if (!d.timetable) { parts.push(emptyView('🗓️', 'لم يُعتمد جدول دراسي بعد', 'سيظهر هنا بمجرد أن يعتمده الأدمن')); root.replaceChildren.apply(root, parts); return; }
      if (!d.days.length) { parts.push(emptyView('📅', 'لا توجد أيام مفعّلة في الجدول')); root.replaceChildren.apply(root, parts); return; }

      var dates = L.weekDates(d.now.iso, d.now.weekday);
      var week = h('div', { class: 'week', role: 'tablist', 'aria-label': 'أيام الأسبوع' });
      d.days.forEach(function (day) {
        var b = h('button', { role: 'tab', onclick: function () { S.selectedId = day.id; S.userPicked = true; updateChips(); paintPanel(); } });
        chips[day.id] = { el: b, day: day, dn: h('span', { class: 'dn', text: day.label }),
          dd: h('span', { class: 'dd' }, bdi(dates[day.weekday].day + ' ' + MONTHS[dates[day.weekday].month])),
          cnt: h('span', { class: 'cnt', text: day.lecture_count ? day.lecture_count + ' محاضرات' : 'لا محاضرات' }), badge: h('span', { class: 'badge' }) };
        b.append(chips[day.id].dn, chips[day.id].dd, chips[day.id].cnt, chips[day.id].badge);
        week.appendChild(b);
      });
      parts.push(week);
      panel = h('div', { class: 'stack', id: 'tt-panel' });
      parts.push(panel);
      root.replaceChildren.apply(root, parts);
      updateChips(); paintPanel();
      var sel = chips[S.selectedId]; if (sel && sel.el.scrollIntoView) { try { sel.el.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* */ } }
    }
    var panel = null;
    function ctx() { var s = S.data.states || {}; return { selectedId: S.selectedId, todayId: s.today_day_id, todayHasClasses: !!s.today_has_classes, nextId: s.next_day_id }; }
    function updateChips() {   // تعديل الأصناف على نفس العناصر ليعمل انتقال التوهج بسلاسة
      var c = ctx();
      Object.keys(chips).forEach(function (id) {
        var e = chips[id], st = L.dayChipState(e.day, c);
        e.el.className = st.className;
        e.el.setAttribute('aria-selected', String(st.selected));
        if (st.today) e.el.setAttribute('aria-current', 'date'); else e.el.removeAttribute('aria-current');
        e.badge.textContent = st.badge ? st.badge.text : ''; e.badge.style.display = st.badge ? '' : 'none';
      });
    }
    function paintPanel() {
      if (!panel) return;
      var day = S.data.days.filter(function (x) { return x.id === S.selectedId; })[0];
      if (!day) { panel.replaceChildren(emptyView('📅', 'اختر يوماً')); return; }
      var isToday = S.data.states && day.id === S.data.states.today_day_id;
      var dates = L.weekDates(S.data.now.iso, S.data.now.weekday)[day.weekday];
      var head = h('div', { class: 'row' }, h('h2', { class: 'grow', text: day.label }), h('span', { class: 'muted small' }, bdi(dates.day + ' ' + MONTHS[dates.month])));
      if (!day.lectures.length) {
        panel.replaceChildren(head, emptyView('🌿', 'لا توجد محاضرات في هذا اليوم', 'يوم عطلة بالنسبة لكروبك'));
        return;
      }
      var m = nowMin();
      panel.replaceChildren(head, h('div', { class: 'stack' }, day.lectures.map(function (l) {
        var status = isToday ? L.lectureStatus(l, m) : null;
        var chipsRow = [];
        if (status === 'ongoing') chipsRow.push(h('span', { class: 'chip ok' }, '● جارية الآن'));
        else if (status === 'upcoming') chipsRow.push(h('span', { class: 'chip primary' }, 'قادمة'));
        else if (status === 'finished') chipsRow.push(h('span', { class: 'chip' }, 'انتهت'));
        if (l.shared) chipsRow.push(h('span', { class: 'chip' }, icon('users'), 'مشتركة: ' + l.groups.join(' · ')));
        return h('article', { class: 'lec c-' + (l.color || 'blue') + (status ? ' is-' + status : '') },
          h('div', { class: 'time' }, time12(l.start), h('small', null, time12(l.end))),
          h('div', { class: 'grow' }, h('h3', { class: 'user-text', dir: 'auto', text: l.subject }),
            h('div', { class: 'meta' },
              l.teacher ? h('span', null, icon('user'), h('span', { class: 'user-text', dir: 'auto', text: l.teacher })) : null,
              l.room ? h('span', null, icon('pin'), 'قاعة ', bdi(l.room)) : null),
            chipsRow.length ? h('div', { class: 'row wrap' }, chipsRow) : null,
            l.notes ? h('div', { class: 'notes user-text pre', dir: 'auto', text: l.notes }) : null));
      })));
    }

    // تحديث دوري خفيف: كل 60ث للجلب (والصفحة ظاهرة فقط) + كل 30ث لإعادة حساب حالة المحاضرات
    var poll = setInterval(function () { if (!document.hidden) load(); }, 60000);
    var tick = setInterval(function () { if (!document.hidden && S.data && S.data.timetable) paintPanel(); }, 30000);
    function onVis() { if (!document.hidden) load(); }
    document.addEventListener('visibilitychange', onVis);
    timers = [poll, tick];
    cleanup = function () { timers.forEach(clearInterval); document.removeEventListener('visibilitychange', onVis); };
    return load();
  }

  // ---------- الإقلاع ----------
  function applyTheme() {
    var scheme = (tg && tg.colorScheme) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', scheme === 'dark' ? 'dark' : 'light');
    if (tg) { try { tg.setHeaderColor(scheme === 'dark' ? '#172033' : '#ffffff'); tg.setBackgroundColor(scheme === 'dark' ? '#0e1320' : '#f3f5fb'); } catch (e) { /* إصدار قديم */ } }
  }
  function boot() {
    applyTheme();
    if (!tg || !tg.initData) {
      nav.style.display = 'none';
      setView(h('div', { class: 'state card' }, h('span', { class: 'big' }, '🔒'), h('h2', { text: 'افتح التطبيق من داخل تليغرام' }),
        h('p', { class: 'muted', text: 'هذه الصفحة تعمل فقط عند فتحها من زر «فتح التطبيق» في البوت.' })));
      return;
    }
    tg.ready(); try { tg.expand(); } catch (e) { /* */ }
    tg.onEvent && tg.onEvent('themeChanged', applyTheme);
    if (tg.BackButton) tg.BackButton.onClick(function () { history.back(); });
    buildNav();
    window.addEventListener('hashchange', route);
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

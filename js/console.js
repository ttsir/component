if (!window.console) {
  var useConsole = false;

  var console = {
    init: function () {
      console.d = document.createElement('div');
      document.body.appendChild(console.d);

      var a = document.createElement('a');
      a.href = 'javascript:console.hide()';
      a.innerHTML = '自定义控制:[close]';

      console.d.appendChild(a);
      var a = document.createElement('a');
      a.href = 'javascript:console.clear();';
      a.innerHTML = '[clear]' + '<hr/>';
      console.d.appendChild(a);

      var id = 'fauxconsole';

      if (!document.getElementById(id)) {
        console.d.id = id;
      }

      console.hide();
    },
    hide: function () {
      console.d.style.display = 'none';
    },
    show: function () {
      console.d.style.display = 'block';
    },
    log: function (o) {
      if (!useConsole) {
        return;
      }

      try {
        console.d.innerHTML += JSON.stringify(o) + '<hr/>';
        console.show();
      } catch (e) {
      }
    },
    clear: function () {
      console.d.parentNode.removeChild(console.d);
      console.init();
      console.show();
    },
    addLoadEvent: function (func) {
      var oldonload = window.onload;
      if (typeof window.onload != 'function') {
        window.onload = func;
      } else {
        window.onload = function () {
          if (oldonload) {
            oldonload();
          }
          func();
        }
      }
    }
  };

  console.addLoadEvent(console.init);
}

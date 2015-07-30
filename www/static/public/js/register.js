var login = (function (ninjaSignIn, undefined) {

  'use strict';

  var provider = {
    google: {
      loginURL: '/auth/gplus',
      authURL: 'https://accounts.google.com/o/oauth2/auth',
      queryParams: {
        client_id: '969868015384-o3odmnhi4f6r4tq2jismc3d3nro2mgvb.apps.googleusercontent.com',
        redirect_uri: window.location.protocol + '//' + window.location.host + '/auth/success',
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        state: 'state'
      },
      popupOptions: {
        width: 452,
        height: 633
      }
    },
    linkedin: {
      loginURL: '/auth/linkedin',
      authURL: 'https://www.linkedin.com/uas/oauth2/authorization',
      queryParams: {
        client_id: '75mfhvxm75cuur',
        redirect_uri: window.location.protocol + '//' + window.location.host + '/auth/success',
        response_type: 'code',
        scope: 'r_basicprofile r_emailaddress',
        state: 'state'
      },
      popupOptions: {
        width: 527,
        height: 582
      }
    },
  };
  /***********************************************************


  ***********************************************************/
  function init() {

    console.log("init page");

    //on click oauth signin buttons
    [].forEach.call(document.querySelectorAll('.signin'), function (el) {
      el.addEventListener('click', signIn, false);
    });

    //setup login modal handlers
    var dialogLogin = document.querySelector('dialog#login-modal');
    var dialogImg = document.querySelector('dialog#img-view');


    if (dialogLogin && dialogImg) { //make sure the page has a dialog

      dialogPolyfill.registerDialog(dialogLogin); //register with polyfill
      dialogPolyfill.registerDialog(dialogImg); //register with polyfill


      //set to correct login status
      setMenuItems();

      //on click pass list button
      document.getElementById('pass-btn').addEventListener('click', function (e) {
        e.preventDefault();
        if (isAuthenticated()) {
          loadAccount();
        }
      });

      //on click login nav button
      [].forEach.call(document.querySelectorAll('.login-btn'), function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          dialogLogin.showModal();
        }, false);
      });
      //on click log out button
      document.getElementById('logout-btn').addEventListener('click', logOut);

      //on click term checkbox
      document.getElementById('terms').addEventListener('click', function (e) {
        if (this.checked == false) {
          [].forEach.call(document.querySelectorAll('.signin'), function (el) {
            el.disabled = true;
          });
        } else {
          [].forEach.call(document.querySelectorAll('.signin'), function (el) {
            el.disabled = false;
          });
        }
      });

      //on click terms and conditions
      document.getElementById('show-terms').addEventListener('click', function (e) {
        e.preventDefault();
        loadTerms();
        document.getElementById('read-terms').style.display = 'inline';
      });

      //on click dialog close button
      document.getElementById('login-close').addEventListener('click', function (e) {
        dialogLogin.close();
        resetDialog();
      });

      //click outside modal box
      [].forEach.call(document.querySelectorAll('dialog'), function (el) {
        el.addEventListener('click', function (e) {
          if (!this.open) { //don't close if not open...
            return;
          }
          if (clickedInDialog(this, e)) { //don't close if clicked inside modal
            return;
          }
          this.close();
          resetDialog();
        }, false);
      });

      //on click img thumbnail
      [].forEach.call(document.querySelectorAll('.thumbnail-img'), function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();

          var img = dialogImg.querySelector('img');
          var spinner = dialogImg.querySelector('i#img-spin');

          //display spinner not image
          img.style.display = 'none';
          spinner.style.display = 'inline';

          //display image after its loaded
          img.addEventListener("load", function imgLoaded(e) {
            spinner.style.display = 'none';
            img.style.display = 'inline';
            e.target.removeEventListener(e.type, imgLoaded); //only execute event once
          })
          var imgHref = this.getAttribute('href');

          //image already loaded
          if (img.getAttribute('src') == imgHref) {
            spinner.style.display = 'none';
            img.style.display = 'inline';
          } else {
            img.setAttribute('src', imgHref)
          }

          dialogImg.showModal();

        }, false);
      });

      //on click img dialog close button
      /*    document.getElementById('img-close').addEventListener('click', function (e) {
            dialogImg.close();
          }); */

    }
  }
  /***********************************************************


  ***********************************************************/
  function setMenuItems() {

    if (isAuthenticated()) { //show logout
      //hide login buttons
      [].forEach.call(document.querySelectorAll('.login-btn'), function (el) {
        el.style.display = 'none';
      });
      //show logout button
      document.getElementById('logout-btn').style.display = 'inline';
      //show pass list button
      document.getElementById('pass-btn').style.display = 'inline';


    } else { //show login

      //show login buttons
      [].forEach.call(document.querySelectorAll('.login-btn'), function (el) {
        el.style.display = 'inline';
      });
      //hide logout btn
      document.getElementById('logout-btn').style.display = 'none';
      //hide pass list button
      document.getElementById('pass-btn').style.display = 'none';

    }

  }

  /***********************************************************


  ***********************************************************/
  function clickedInDialog(dialog, mouseEvent) {
    var rect = dialog.getBoundingClientRect();
    return rect.top <= mouseEvent.clientY && mouseEvent.clientY <= rect.top + rect.height && rect.left <= mouseEvent.clientX && mouseEvent.clientX <= rect.left + rect.width;
  }

  /***********************************************************


  ***********************************************************/
  function signIn(e) {
    e.preventDefault();

    //show spinner
    document.getElementById('login-spin').style.display = 'inline';
    //disable sigin buttons
    [].forEach.call(document.querySelectorAll('.signin'), function (el) {
      el.disabled = true;
    });

    var authProvider = this.getAttribute('id');

    if (isAuthenticated()) { //already logged in
      loadAccount();
    } else { //initiate oauth sign in
      if (setState(provider[authProvider])) {
        var url = getAuthUrl(provider[authProvider]); //get the provider url
        //Set Oauth Popup
        oAuthPopup(provider[authProvider], url);
      }
    }

  }
  /***********************************************************


  ***********************************************************/
  function isAuthenticated() {

    var token = readCookie('token');
    if (token) { //a simple check if the token expired.
      if (token.split('.').length === 3) {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace('-', '+').replace('_', '/');
        var exp = JSON.parse(window.atob(base64)).exp;
        return Math.round(new Date().getTime() / 1000) <= exp;
      } else {
        return true;
      }
    }
    return false;
  }
  /***********************************************************


  ***********************************************************/
  function logOut(e) {
    e.preventDefault();
    window.sessionStorage.clear(); //clear it all
    eraseCookie('token'); //remove token.
    window.location = "/";
  }

  /***********************************************************


   ***********************************************************/
  function oAuthPopup(auth, url) {

    //open the oauth window
    var options = auth.popupOptions;
    var popupWindow = window.open(url, '_blank', 'width=' + options.width + ',height=' + options.height);

    //focus the oauth window
    if (popupWindow && popupWindow.focus) {
      popupWindow.focus();
    }

    var polling = window.setInterval(function () {
      try {
        if (popupWindow.document.domain === document.domain && (popupWindow.location.search || popupWindow.location.hash)) {

          popupWindow.close();
          window.clearInterval(polling);
          post(auth.loginURL, popupWindow.location.search);

        }
      } catch (error) {}

      if (popupWindow.closed) {
        window.clearInterval(polling);
      }
    }, 35);
  }
  /***********************************************************


   ***********************************************************/
  function getAuthUrl(authProvider) {

    var param = serialize(authProvider.queryParams);
    //console.log(authProvider.authURL + "?" + param);
    return authProvider.authURL + "?" + param;
  }
  /***********************************************************


  ***********************************************************/
  function setState(authProvider) {
    var sid = readCookie("sid");
    if (!sid) {
      return false;
    }
    authProvider.queryParams.state = sid;
    return true;
  }

  /***********************************************************


  ***********************************************************/
  function post(provider, query) {

    console.log(provider);
    console.log(query);

    var req = new XMLHttpRequest();
    req.open('POST', provider + query, true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.onload = function () {
      if (req.status >= 200 && req.status < 400) {
        var data = JSON.parse(req.responseText);
        createCookie("token", data.token);
        loadAccount();
      } else {
        console.warn(req.responseText);
        if (req.status === 401 || req.status === 403) {
          logOut();
        }
      }
    };
    req.send();

  }
  /***********************************************************


  ***********************************************************/
  function loadTerms() {
    console.log("loadTerms");

    var req = new XMLHttpRequest();
    req.open('GET', '/assets/terms.txt', true);
    req.onload = function () {
      if (req.status >= 200 && req.status < 400) {
        document.getElementById('terms-text').innerHTML = req.responseText;
      } else {
        console.warn(req.responseText);
        var error = JSON.parse(req.responseText);
        document.getElementById('terms-text').innerHTML = error.error();
      }
    };
    req.send();

  }
  /***********************************************************


  ***********************************************************/
  function resetDialog() {
    //hide spinner
    document.getElementById('login-spin').style.display = 'none';
    //recheck terms check
    document.getElementById('terms').checked = true;
    //enable sigin buttons
    [].forEach.call(document.querySelectorAll('.signin'), function (el) {
      el.disabled = false;
    });
  }

  /***********************************************************


  ***********************************************************/
  function loadAccount() {

    var authToken = readCookie('token');

    if (authToken) {
      window.location = "/accounts/home";
    }
  }

  /***********************************************************


  ***********************************************************/
  function createCookie(name, value, days) {
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      var expires = "; expires=" + date.toGMTString();
    } else var expires = "";
    document.cookie = name + "=" + value + expires + "; path=/";
  }
  /***********************************************************


  ***********************************************************/
  function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }
  /***********************************************************


  ***********************************************************/
  function eraseCookie(name) {
    createCookie(name, "", -1);
  }
  /***********************************************************


  ***********************************************************/
  function serialize(obj) {
    var str = [];
    for (var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  }

  ninjaSignIn.init = function () {
    init();
  };

}(ninjaSignIn = window.ninjaSignIn || {}));




/***********************************************************
  Init js on page load

***********************************************************/
(function (window, document) {

  ninjaSignIn.init(); //start ninja signin

  var menu = document.getElementById('menu');

  if (menu) { //make sure the page has a menu

    var WINDOW_CHANGE_EVENT = ('onorientationchange' in window) ? 'orientationchange' : 'resize';

    function toggleHorizontal() {
      [].forEach.call(
        document.getElementById('menu').querySelectorAll('.custom-can-transform'),
        function (el) {
          el.classList.toggle('pure-menu-horizontal');
        }
      );
    };

    function toggleMenu() {
      // set timeout so that the panel has a chance to roll up
      // before the menu switches states
      if (menu.classList.contains('open')) {
        setTimeout(toggleHorizontal, 500);
      } else {
        toggleHorizontal();
      }
      menu.classList.toggle('open');
      document.getElementById('toggle').classList.toggle('x');
    };

    function closeMenu() {
      if (menu.classList.contains('open')) {
        toggleMenu();
      }
    }

    document.getElementById('toggle').addEventListener('click', function (e) {
      e.preventDefault();
      toggleMenu();
    });

    window.addEventListener(WINDOW_CHANGE_EVENT, closeMenu);
  }
})(this, this.document);

/***********************************************************


***********************************************************/
(function (i, s, o, g, r, a, m) {
  i['GoogleAnalyticsObject'] = r;
  i[r] = i[r] || function () {
    (i[r].q = i[r].q || []).push(arguments)
  }, i[r].l = 1 * new Date();
  a = s.createElement(o),
    m = s.getElementsByTagName(o)[0];
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m)
})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

ga('create', 'UA-2856856-5', 'auto');
ga('send', 'pageview');

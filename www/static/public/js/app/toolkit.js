(function (app, $, undefined) {

  'use strict';


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  app.toolkit = {

    /***********************************************************



     ***********************************************************/
    swipeEvents: function (el) {
      var startX,
        startY;

      el.removeEventListener("touchstart", tstart);
      el.addEventListener("touchstart", tstart);

      function tstart(event) {
        var touches = event.touches;
        if (touches && touches.length) {
          console.log("touchstart");
          startX = touches[0].pageX;
          startY = touches[0].pageY;
          el.addEventListener("touchmove", tmove);
        }
      }

      function tmove(event) {
        var touches = event.touches;
        if (touches && touches.length) {
          event.preventDefault();
          var deltaX = startX - touches[0].pageX;
          var deltaY = startY - touches[0].pageY;

          if (deltaX >= 50) {
            var event = new Event('swipeLeft');
            el.dispatchEvent(event);
          }
          if (deltaX <= -50) {
            var event = new Event('swipeRight');
            el.dispatchEvent(event);
          }
          if (deltaY >= 50) {
            var event = new Event('swipeUp');
            el.dispatchEvent(event);
          }
          if (deltaY <= -50) {
            var event = new Event('swipeDown');
            el.dispatchEvent(event);
          }
          if (Math.abs(deltaX) >= 50 || Math.abs(deltaY) >= 50) {
            el.removeEventListener('touchmove', tmove);
          }
        }
      }

    },

    /***********************************************************



     ***********************************************************/
    alertDisplay: function (alertType, alertMessage) {
      //how long an alert is displayed
      var alertTimeout = 4500;
      var outHtml = '';
      var alertClass = 'alert-info';

      if (alertType == 'error') {
        alertClass = 'alert-error'; //red
        outHtml = '<i class="fa fa-frown-o"></i><strong>&nbsp; Error! &nbsp;</strong>'; //error style
      } else if (alertType == 'saved') {
        alertClass = 'alert-success'; //green
        outHtml = '<i class="fa fa-check-square-o"></i><strong>&nbsp; Saved! &nbsp;</strong>' //saved style
      }
      d3.select('.alert')
        .attr('class', 'alert alert-dismissable ' + alertClass)
        .html(outHtml + alertMessage)
        .style('display', 'inline');

      setTimeout(function () {
        d3.select('.alert').style('display', 'none');
      }, alertTimeout);
    },

    /***********************************************************
		Tests whether a json field is undefined and if it is not
		sets it to '' or to a default.

		***********************************************************/
    valueOrDefault: function (val, def) {
      if (def == undefined) def = '';
      return val == undefined ? def : val;
    },

    /***********************************************************



     ***********************************************************/
    show: function () {
      for (var i = 0; i < arguments.length; i++) {
        var el = arguments[i];
        if (typeof el === "string") {
          el = document.querySelector(el);
        } else if (el instanceof d3.selection) {
          el = el.node();
        }
        el.style.display = '';
      }
    },
    /***********************************************************



     ***********************************************************/
    hide: function () {
      for (var i = 0; i < arguments.length; i++) {
        var el = arguments[i];
        if (typeof el === "string") {
          el = document.querySelector(el);
        } else if (el instanceof d3.selection) {
          el = el.node();
        }
        el.style.display = 'none';
      }
    },
    /***********************************************************



     ***********************************************************/
    enable: function () {
      for (var i = 0; i < arguments.length; i++) {
        var el = arguments[i];
        if (typeof el === "string") {
          el = document.querySelector(el);
        } else if (el instanceof d3.selection) {
          el = el.node();
        }
        el.disabled = false;
      }
    },
    /***********************************************************



     ***********************************************************/
    disable: function () {
      for (var i = 0; i < arguments.length; i++) {
        var el = arguments[i];
        if (typeof el === "string") {
          el = document.querySelector(el);
        } else if (el instanceof d3.selection) {
          el = el.node();
        }
        el.disabled = true;
      }
    },

    /***********************************************************

		check value input and set value property of selected input elem

		***********************************************************/
    setValue: function (selector, value) {
      if (value) {
        d3.select(selector)
          .property('value', value);
      }
    },
    /***********************************************************



     ***********************************************************/
    getToken: function () {
      var token = app.toolkit.readCookie('token');
      console.log(token);
      if (token == undefined) {
        window.location = '/';
      }
      return token;
    },
    /***********************************************************


     ***********************************************************/
    createCookie: function (name, value, days) {
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        var expires = "; expires=" + date.toGMTString();
      } else var expires = "";
      document.cookie = name + "=" + value + expires + "; path=/";
    },
    /***********************************************************


     ***********************************************************/
    readCookie: function (name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    },
    /***********************************************************


     ***********************************************************/
    eraseCookie: function (name) {
      app.toolkit.createCookie(name, "", -1);
    },
    /***********************************************************



     ***********************************************************/
    gUID: function () {
      return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
    },
    /***********************************************************
		selects a template tag and appends it to the doc. parameter
		childNodeNum uses insertBefore to add the template before another element.

		***********************************************************/
    stampTemplate: function (templateSelector, containerSelector, childNodeNum) {
      var template = document.querySelector(templateSelector).content;
      var clone = document.importNode(template, true)
      var host = document.querySelector(containerSelector);

      if (childNodeNum != undefined) {
        host.insertBefore(clone, host.childNodes[childNodeNum]);
      } else {
        host.appendChild(clone);
      }
      return clone;
    },

    /***********************************************************


     ***********************************************************/
    loadSVG: function (passType, callback) {
      console.log('loadSVG');

      var url = '/assets/svg/' + passType + '.svg';
      var uri = encodeURI(url);
      console.log(uri);

      var req = new XMLHttpRequest();
      req.open('GET', uri, true);
      req.overrideMimeType('image/svg+xml');
      req.setRequestHeader('Accept', 'image/svg+xml');
      req.onload = callback;
      req.send();

      //load svg xml + place into document
      //d3.xml(uri, 'image/svg+xml', callback);

    },
    /***********************************************************


     ***********************************************************/
    checkLoadError: function (error) {

      if (error) {
        console.warn(error);

        if (error.status === 304) {
          return true;
        }

        if (error.status === 0) { //timeout or connection refused
          app.toolkit.alertDisplay('error', "Connection refused, server or network unavailable.");
          return true;
        }

        if (error.status === 401 || error.status === 403) {
          window.sessionStorage.removeItem('token'); //clear all sessions storages
          window.sessionStorage.removeItem('models');
          window.sessionStorage.removeItem('active');
          document.cookie = "";
          window.location = "/";
          return true;
        }

        var errorObj = JSON.parse(error.responseText);
        app.toolkit.alertDisplay('error', errorObj.error);
        return true;
      }
      return false;
    },

    /***********************************************************
     * The HTML5 spec was changed in 2011 to state popstate should not
     * fired on page load. Chrome(34) & Firefox(4) has fixed the bug but
     * some browsers (e.g. Safari) are still fire the popstate on
     * the page load. This object created from the Pjax Library to handle
     * this issue.
     ***********************************************************/
    popstatePageloadFix: {
      popped: ('state' in window.history && window.history.state !== null),
      initialUrl: location.href,
      initialPop: false,
      init: function () {
        this.initialPop = !this.popped && location.href == this.initialUrl;
        this.popped = true;
        return this.initialPop;
      }
    },

    /***********************************************************

		check browser locale support
		***********************************************************/
    toLocaleStringSupportsLocales: function () {
      if (window.Intl && typeof window.Intl === 'object') {
        return true;
      } else {
        $.getScript('/assets/js/Intl.min.js')
          .done(function (script, textStatus) {
            console.log(textStatus);
          })
          .fail(function (jqxhr, settings, exception) {
            alertDisplay('error', 'problem loading Intl.min.js');
          });
        return false;
      }
    }

  };

}(passNinja = window.passNinja || {}, jQuery));

(function (app) {

  'use strict';

  var passModelList = [];
  var activePass = {
    index: "",
    type: "",
    rootID: ""
  };

  /***********************************************************
  createEditor stamps the template for the editor page,
  and loads the front svg

	***********************************************************/
  function createEditor(isNewPass) {
    app.toolkit.stampTemplate('template#pass-builder', 'body'); //add editor template
    //app.toolkit.stampTemplate('template#page1-builder', '.main', 0); //add new pass selector template

    if (!isNewPass) { //editing old pass.

      app.setPassActive('#front-content', app.getPassActive().index); //the rootID of the current active pass

      app.toolkit.loadSVG(app.getPassActive().type, function () { //svg load callback
        if (this.status >= 200 && this.status < 400) {

          var xmlDoc = this.responseXML;
          var wrapSVG = wrap(xmlDoc.documentElement); //wrap the svg in webcomponents.js polyfill for use with shadowdom
          var shadowRootElm = document.querySelector('#front-content').createShadowRoot();
          shadowRootElm.appendChild(wrapSVG); //append svg
          app.passEditor.editor();

        } else {

          console.warn(this.responseText);
          var error = JSON.parse(this.responseText);
          app.toolkit.alertDisplay('error', error.statusText);

        }
      });
    }

    app.passEditor.init(); //init editor

  }


  /***********************************************************
    initBackButtonEvent adds an event listener for the browser
    back button click.

		***********************************************************/
  function initBackButtonEvent() {

    //event back button pressed
    window.addEventListener("popstate", function (e) {

      // Ignore initial popstate that some browsers (safari) fire on page load
      if (app.toolkit.popstatePageloadFix.init()) return;


      console.warn(window.location.hash);
      console.log(window.location.pathname);
      console.log(window.history.state);

      switch (window.location.pathname) {

      case "/accounts/editor": //========================

        //load the editor if not loaded. (popstate forward button)
        var next = document.querySelector("section[data-index='" + (window.history.state.index) + "']");
        if (next === null) {
          app.setEditorPage(false,window.history.state.index);
        }
        //if back button on first page, go to homepage
        if (!window.location.hash || window.location.hash === '#1' || !Object.keys(window.history.state).length) {
          app.setHomePage();
        } else {
          var hash = window.location.hash.substring(1);
          console.warn(hash);
          onePageScroll.moveBack('.main', window.history.state);
        }

        break;

      case "/accounts/home": //========================
      console.log(window.history.state);
        break;
      }


    });
  }

  /***********************************************************
  Handler for navbar logout button click

  ***********************************************************/
  function logOut() {

    d3.event.preventDefault();
    window.sessionStorage.clear(); //clear it all
    app.toolkit.eraseCookie('token'); //remove token.
    window.location = "/";
  }

  /***********************************************************
  Handler for navbar feedback button click

  ***********************************************************/
  function feedBackModal() {

    //setup login modal handlers
    var dialog = document.querySelector('dialog#feedback-modal');
    dialogPolyfill.registerDialog(dialog); //register with polyfill

    //feedback nav bar button
    d3.select('#feedback-btn').on('click', function () {
      d3.event.preventDefault();
      dialog.showModal();
    });

    //on click dialog close button
    d3.select('#feedback-close').on('click', function () {
      closeFeedback(dialog);
    });

    //click outside modal box
    d3.select('dialog#feedback-modal').on('click', function () {
      if (!dialog.open) { //don't close if not open...
        return;
      }
      if (clickedInDialog(dialog, d3.event)) { //don't close if clicked inside modal
        return;
      }
      closeFeedback(dialog);
    });

    //click send button
    d3.select('#feedback-send').on('click', sendFeedback);

  }

  function closeFeedback(dialog) {
    d3.select('#feedback-title').transition().text('Say Hello');
    dialog.close();
  }

  /***********************************************************


  ***********************************************************/
  function sendFeedback() {

    var feedbackType = d3.select('#feedback-type').node().value;
    var feedbackMessage = d3.select('#feedback-text').node().value;

    //don't send if empty textarea
    if (feedbackMessage == "") {
      return;
    }

    var feedback = {
      'fbtype': feedbackType,
      'msg': feedbackMessage
    };

    d3.json('/accounts/feedback')
      .header("Content-Type", "application/json")
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .post(JSON.stringify(feedback), function (error, data) {

        if (error) {
          console.warn(error);
          d3.select('#feedback-title').transition().text('Send Failed!');
          return;
        }
        console.log(data);
        d3.select('#feedback-title').transition().text('Thank you!');
        d3.select('#feedback-text').node().value = ""; //clear it
        feedback = {};
      });

  }

  /***********************************************************


  ***********************************************************/
  function clickedInDialog(dialog, mouseEvent) {
    var rect = dialog.getBoundingClientRect();
    return rect.top <= mouseEvent.clientY && mouseEvent.clientY <= rect.top + rect.height && rect.left <= mouseEvent.clientX && mouseEvent.clientX <= rect.left + rect.width;
  }

  /***********************************************************
  removeMarker removes the marker object from the passModelList
  data being saved in storage. The marker object is created by
  the location map. This data is rebuild on editor load anyway.

  ***********************************************************/
  function removeMarker(key, value) {

    if (key === 'marker') {
      return undefined;
    }
    return value;
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  //======================================================
  //
  //======================================================
  app.init = function () {


    document.addEventListener("WebComponentsReady", function (event) {

      console.log("webcomponents ready");


      d3.select('#logout-btn').on('click', logOut); //logout nav bar button
      feedBackModal();

      console.log(window.location.pathname);

      switch (window.location.pathname) {

      case "/accounts/editor": //========================

        if (!app.getPassActive()) { //no active pass.
          createEditor(true); //create new pass
        } else {
          createEditor(false); //edit pass
        }

        break;

      default: //======================= /accounts/home
        app.grid.init(); //build pass grid
      }

    });

    initBackButtonEvent();

  }

  //======================================================
  //moveToHome removes the editor screen and loads the home
  //grid page.
  //======================================================
  app.setHomePage = function () {

    var docBody = d3.select('body')
      .attr('class', null);

    docBody.select('div.main').remove();
    docBody.select('a.next').remove();
    docBody.select('a.return').remove();
    docBody.select('.h-pagination').remove();

    onePageScroll.disable();

    history.replaceState({}, "Home", "home"); //update url

    app.grid.init(); //load grid template

  }

  //======================================================
  //loadEditor removes the pass selection template and loads
  //the editor template.
  //======================================================
  app.setEditorPage = function (isNewPass, pageNum) {

    var pageHash = 2;

    //create a fade transistion for page change
    d3.select('body div.container').transition()
      .style('opacity', 0)
      .remove()
      .each("end", function () { //at transistion end. load templates
        createEditor(isNewPass);
        onePageScroll.enable();

        if (!isNewPass) {
          //set start page to where you left off, or page 2 if completed.
          var passStatus = app.getPassModel().status;
          console.log(passStatus);

          if (parseInt(passStatus) >= 2) {
            pageHash = parseInt(passStatus);
            onePageScroll.moveTo('.main', pageHash);
            history.pushState({}, "Editor", "editor#"+pageHash); //update url
          } else { //ready, api, or 0, 1 ""
            if (pageNum != undefined) {
              pageHash = pageNum;
              onePageScroll.moveTo('.main', pageHash);
              history.pushState({}, "Editor", "editor#"+pageHash); //update url
            } else { //default to 2 if second argument is not set
              onePageScroll.moveTo('.main', 2);
              history.pushState({}, "Editor", "editor#"+pageHash); //update url

            }
          }
        } else {
          history.pushState({}, "Editor", "editor");
        }
      });


  }

  //======================================================
  //
  //======================================================
  app.setPassActive = function (rootSelector, index) {
      console.log(passModelList + " index:" + index);
      activePass.index = index;
      activePass.type = app.getPassModelList()[index].passtype;
      activePass.rootID = rootSelector;
      console.log("index: " + activePass.index + " type: " + activePass.type + " rootID: " + activePass.rootID);
      window.sessionStorage.setItem('active', JSON.stringify(activePass));

    }
    //======================================================
    //
    //======================================================
  app.getPassActive = function () {
      if (!activePass || !activePass.index) {
        activePass = JSON.parse(window.sessionStorage.getItem('active'));
      }
      return activePass;
    }
    //======================================================
    //
    //======================================================
  app.setSVGRoot = function (rootSelector) {
      activePass.rootID = rootSelector;
    }
    //======================================================
    //
    //======================================================
  app.getSvgRoot = function () {
      return d3.select(document.querySelector(app.getPassActive().rootID).shadowRoot);
    }
    //======================================================
    //
    //======================================================
  app.getPassModel = function () {
      return app.getPassModelList()[app.getPassActive().index];
    }
    //======================================================
    //
    //======================================================
  app.delPassModel = function () {

      var passModel = app.getPassModel();
      if (app.getNumPassModel() > 0) {
        passModelList.splice(app.getPassActive().index, 1); //remove from list
        app.savePassModelList(); //save the state of the list to storage
        console.warn(passModelList);
        console.warn(JSON.parse(window.sessionStorage.getItem('models')));
      }

      d3.xhr('/api/v1/passes/' + passModel.id)
        .header("Authorization", "Bearer " + app.toolkit.getToken())
        .send('DELETE', function (error, data) {
          if (app.toolkit.checkLoadError(error)) return;
          app.toolkit.alertDisplay('saved', 'Pass successfully deleted.');
        });
    }
    //======================================================
    //
    //======================================================
  app.addPassModel = function (passData) {
      app.getPassModelList().push(passData);
    }
    //======================================================
    //
    //======================================================
  app.setPassModelList = function (list) {
      passModelList = list;
      window.sessionStorage.setItem('models', JSON.stringify(passModelList, removeMarker));
    }
    //======================================================
    //
    //======================================================
  app.getPassModelList = function () {
      if (!passModelList || !passModelList.length) {
        var storeList = JSON.parse(window.sessionStorage.getItem('models'));
        if (storeList) {
          passModelList = storeList;
        }
      }
      return passModelList;
    }
    //======================================================
    //
    //======================================================
  app.savePassModelList = function () {
      window.sessionStorage.setItem('models', JSON.stringify(passModelList, removeMarker));
    }
    //======================================================
    //
    //======================================================
  app.getNumPassModel = function () {
    return app.getPassModelList().length;
  }

  return app; //return the app object


})(this.passNinja = window.passNinja || {});


//======================================================
//
//======================================================
(function (window, document) {

  window.passNinja;
  passNinja.init();

  var menu = document.getElementById('menu'),
    WINDOW_CHANGE_EVENT = ('onorientationchange' in window) ? 'orientationchange' : 'resize';

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
})(this, this.document);

//======================================================
// Add or remove debug statements
//======================================================
(function () {

  var debug = false;

  if (debug === false) {
    if (typeof (window.console) === 'undefined') {
      window.console = {};
    }
    window.console.log = function () {};
  }
})();

//======================================================
// Add google analytics
//======================================================
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

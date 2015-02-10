(function(app) {

  'use strict';

  var passModelList = [];
  var activePass = {
    index: "",
    type: "",
    rootID: ""
  };

  /***********************************************************


	***********************************************************/
  function createEditor(isNewPass) {
    app.toolkit.stampTemplate('template#pass-builder', 'body'); //add editor template
    app.toolkit.stampTemplate('template#page1-builder', '.main', 0); //add new pass selector template

    if (!isNewPass) { //editing old pass.

      app.setPassActive('#front-content', app.getPassActive().index); //the rootID of the current active pass
      app.toolkit.loadSVG(app.getPassActive().type, function(error, xml) { //svg load callback

        if (error) {
          console.warn(error);
          app.toolkit.alertDisplay('error', error.statusText);
          return;
        }

        d3.select('div#front-content').node().createShadowRoot().appendChild(xml.documentElement);
        app.passEditor.editor();

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
    window.addEventListener("popstate", function(e) {

      console.warn(window.location.hash);
      console.log(window.history.state);

      if (window.location.pathname === "/accounts/editor") {

        if (!window.location.hash || window.location.hash === '#1' || !Object.keys(window.history.state).length) {

          app.setHomePage();

        } else {

          var hash = window.location.hash.substring(1);
          console.warn(hash);
          onePageScroll.moveBack('.main', window.history.state);

        }
      }


    });
  }

  /***********************************************************
  Handler for navbar logout button click

  ***********************************************************/
  function logOut() {

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
    d3.select('#feedback-btn').on('click',function() {
      dialog.showModal();
    });

    //on click dialog close button
    d3.select('#feedback-close').on('click',function() {
      dialog.close();
    });

    //click outside modal box
    d3.select('dialog#feedback-modal').on('click',function() {
      if (!dialog.open) { //don't close if not open...
        return;
      }
      if (clickedInDialog(dialog, d3.event)) { //don't close if clicked inside modal
        return;
      }
      dialog.close();
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
  app.init = function() {

    d3.select('#logout-btn').on('click',logOut); //logout nav bar button
    feedBackModal();

    document.addEventListener("WebComponentsReady", function(event) {

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
  app.setHomePage = function() {

    var docBody = d3.select('body')
      .attr('class', null);

    docBody.select('div.main').remove();
    docBody.select('a.next').remove();
    docBody.select('a.return').remove();

    onePageScroll.disable();

    history.replaceState({}, "Home", "home"); //update url

    app.grid.init(); //load grid template

  }

  //======================================================
  //loadEditor removes the pass selection template and loads
  //the editor template.
  //======================================================
  app.setEditorPage = function(isNewPass) {

    //create a fade transistion for page change
    d3.select('body div.container').transition()
      .style('opacity', 0)
      .remove()
      .each("end", function() { //at transistion end. load templates
        createEditor(isNewPass);
        onePageScroll.enable();
        if (!isNewPass) {
          //set start page to where you left of, or page 2 if completed.
          var passStatus = app.getPassModel().status;
          console.log(passStatus);
          if (passStatus == "ready" || passStatus == "api") {
            onePageScroll.moveTo('.main', 2);
          } else {
            onePageScroll.moveTo('.main', parseInt(passStatus));
          }

        }
      });

    history.pushState({}, "Editor", "editor"); //update url

  }

  //======================================================
  //
  //======================================================
  app.setPassActive = function(rootSelector, index) {
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
  app.getPassActive = function() {
      if (!activePass || !activePass.index) {
        activePass = JSON.parse(window.sessionStorage.getItem('active'));
      }
      return activePass;
    }
    //======================================================
    //
    //======================================================
  app.setSVGRoot = function(rootSelector) {
      activePass.rootID = rootSelector;
    }
    //======================================================
    //
    //======================================================
  app.getSvgRoot = function() {
      return d3.select(document.querySelector(app.getPassActive().rootID).shadowRoot);
    }
    //======================================================
    //
    //======================================================
  app.getPassModel = function() {
      return app.getPassModelList()[app.getPassActive().index];
    }
    //======================================================
    //
    //======================================================
  app.delPassModel = function() {
      app.getPassModelList().splice(app.getPassActive().index, 1);
    }
    //======================================================
    //
    //======================================================
  app.addPassModel = function(passData) {
      app.getPassModelList().push(passData);
    }
    //======================================================
    //
    //======================================================
  app.setPassModelList = function(list) {
      passModelList = list;
      window.sessionStorage.setItem('models', JSON.stringify(passModelList));
    }
    //======================================================
    //
    //======================================================
  app.getPassModelList = function() {
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
  app.savePassModelList = function() {
      window.sessionStorage.setItem('models', JSON.stringify(passModelList, removeMarker));
    }
    //======================================================
    //
    //======================================================
  app.getNumPassModel = function() {
    return passModelList.length;
  }

  return app; //return the app object


})(passNinja = window.passNinja || {});

console.log(window);
console.log(passNinja);
passNinja.init();

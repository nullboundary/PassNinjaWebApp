(function (app, $, undefined) {

  'use strict';

  var passModelList = [];
  var activePass = {
    index: "",
    type: "",
    rootID: ""
  };

  /***********************************************************


  ***********************************************************/
  function bindPassData(error, data) {

    //check error
    if (error) {
      console.warn(error.statusText);
      app.toolkit.alertDisplay('error', error.statusText);
      return;
    }

    console.log(data);
    passModelList = data; //set master pass data list

    buildPassGrid();
  }

  /***********************************************************


  ***********************************************************/
  function buildPassGrid() {

      var gridList = d3.select('ul#og-grid');

      //bind dataset
      var passListItems = gridList.selectAll('li').data(passModelList);

      //add <li>
      passListItems.enter().append('li')
        .attr('class', 'grid-pass')
        .attr('id', function (d, i) {
          return 'pass-' + i;
        })
        .on('click', function (d, i) {
          app.setPassActive('#pass-' + i, i);
        });

      //add <a>
      passListItems.append('a')
        .attr('href', function (d) {
          return 'editor/' + d.id
        })
        .attr('data-title', function (d) {
          return d.name
        })
        .attr('data-description', function (d) {
          return d.keyDoc.description
        });

      //add <svg>
      passListItems.each(function (d, i) {
        var shadowRootElm = this.createShadowRoot();
        app.toolkit.loadSVG(d.passtype, function (error, xml) { //svg load callback

          if (error) {
            console.warn(error);
            //TODO: should display broken pass image in grid here. 
            app.toolkit.alertDisplay('error', "pass type: " + d.passtype + " " + error.statusText);
            return;
          }

          shadowRootElm.appendChild(xml.documentElement); //append svg
          app.setPassActive('#pass-' + i, i); //set this pass as active
          app.passBuilder.build(); //build it



        });
      });

    }
    /***********************************************************


    ***********************************************************/
  function loadEditor() {

    //create a fade transistion for page change
    d3.select('body div.container').transition()
      .style('opacity', 0)
      .remove()
      .each("end", function () { //at transistion end. load templates

        app.toolkit.stampTemplate('template#pass-builder', 'body'); //add editor template
        app.toolkit.stampTemplate('template#page1-builder', '.main', 0); //add new pass selector template
        history.pushState(null, "Editor", "editor"); //update url

        console.log(app.passBuilder);
        app.passBuilder.init(); //init editor
      });
  }

  /***********************************************************


  ***********************************************************/
  passNinja.init = function () {

      document.addEventListener("WebComponentsReady", function (event) {

        //load grid template
        var gridElem = app.toolkit.stampTemplate('template#pass-grid', 'body');

        //get all user passes from server
        d3.json("/api/v1/passes/")
          .header("Authorization", "Bearer " + app.toolkit.getToken())
          .get(bindPassData);

        //  Grid.init();

        //add event to new pass button.
        d3.select('button#new-pass')
          .on('click', loadEditor);

      });

      initBackEvent();

    }
    /***********************************************************


    ***********************************************************/
  function initBackEvent() {

    //event back button pressed
    window.addEventListener("popstate", function (e) {

      var docBody = document.querySelector('body');
      //remove editor page.
      docBody.removeChild(document.querySelector('div.main'));

      //load grid template
      var gridElem = app.toolkit.stampTemplate('template#pass-grid', 'body');
      buildPassGrid(); //rebuild passes in grid

      //add on event to + pass button.
      d3.select('button#new-pass')
        .on('click', loadEditor);
    });
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  passNinja.setPassActive = function (rootSelector, index) {
    console.log(passModelList + " index:" + index);
    activePass.index = index;
    activePass.type = passModelList[index].passtype;
    activePass.rootID = rootSelector;
    console.log("index: " + activePass.index + " type: " + activePass.type + " rootID: " + activePass.rootID);

  }
  passNinja.getSvgRoot = function () {
    return d3.select(document.querySelector(activePass.rootID).shadowRoot);
  }
  passNinja.getPassModel = function () {
    return passModelList[activePass.index];
  }
  passNinja.delPassModel = function () {
    passModelList.splice(activePass.index, 1);
  }
  passNinja.addPassModel = function (passData) {
    passModelList.push(passData);
  }
  passNinja.getNumPassModel = function () {
    return passModelList.length;
  }

  return passNinja; //return the app object


}(passNinja = window.passNinja || {}, jQuery));

console.log(passNinja);
passNinja.init();

(function(app, $, undefined) {

  'use strict';

  //var passEditor;
  var pageBeforeIndex;
  var pageAfterIndex;
  var passType;
  var passTemplate; //a json object containing all the pass data for this pass

  /***********************************************************


  	***********************************************************/
  function init() {

    passType = 'none';
    //passEditor = app.passEditor;
    console.log(app.passEditor);

    console.log(onePageScroll);

    onePageScroll.init(".main", {
      sectionContainer: 'section',
      pagination: false,
      animationTime: 500,
      updateURL: true,
      beforeMove: onBeforeScroll,
      afterMove: onAfterScroll,
      loop: false,
      keyboard: true,
      responsiveFallback: false
    });

    //Select PassType
    d3.selectAll('.pass-thumb-select')
      .on('click', onSelectType);

    //Click Next Page Button
    d3.select('#next-button')
      .on('click', onNextPage);

    //Click Return Home Page Button
    d3.select('#return-button')
      .on('click', function() {
        app.setHomePage();
      });

    //prevent enter submit for all forms!
    d3.selectAll('form.pure-form')
      .on('keypress', function() {
        var code = d3.event.keyCode || d3.event.which;
        if (code == 13) {
          d3.event.preventDefault();
        }
      });

    addSwipeEvent();


  }

  /***********************************************************


  	***********************************************************/
  function onBeforeScroll(index, nextEl) {
      console.log(d3.select(nextEl));
      if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

        app.passEditor.colors.resetRectStroke(); //reset all rect stroke to none
        addSwipeEvent();
        pageBeforeIndex = index;
        console.log('before ' + index);

        for (var key in app.passEditor) {

          if (app.passEditor[key].hasOwnProperty('index')) {
            if (app.passEditor[key].index() + 1 == index) { //match index of object to page scroll page index

              console.log(app.passEditor[key].name());

              if (app.passEditor[key].hasOwnProperty('save')) { //save object data to server
                app.passEditor[key].save(index);
              }

              if (app.passEditor[key].hasOwnProperty('stroke')) { //change stroke color of rects (some pages)
                app.passEditor[key].stroke();
              }
            }
          }
        }

      }
    }
    /***********************************************************


 	***********************************************************/
  function onAfterScroll(index) {

    if (pageAfterIndex != index) { //prevent handler being called twice per scroll.
      pageAfterIndex = index;
      console.log('after ' + index);

      for (var key in app.passEditor) {
        if (app.passEditor[key].hasOwnProperty('index')) {
          if (app.passEditor[key].index() == index) { //match index of object to page scroll page index

            console.log('after: ' + app.passEditor[key].name());

            //  if (app.passEditor[key].hasOwnProperty('xray')) {
            //    app.passEditor[key].xray(true);
            //    }
            if (app.passEditor[key].hasOwnProperty('handler')) {
              app.passEditor[key].handler();
            }
          }
        }
      }

    }
  }

  /***********************************************************
	initEditor setups up some fields and controls for the pass builder
	tool.

	***********************************************************/
  function initEditor() {

    app.passBuilder.build(); //setup template pass

    //only load back if you haven't already
    if (d3.select('svg.back').empty()) {

      app.toolkit.loadSVG('back', function(error, xml) { //svg load callback

        if (error) {
          console.warn(error);
          app.toolkit.alertDisplay('error', "pass type: " + d.passtype + " " + error.statusText);
          return;
        }

        d3.select('div#back-content').node().appendChild(xml.documentElement);
        configEditor(); //configure editor settings after load
      });

    } else {

      configEditor(); //configure editor settings
    }



  }

  /***********************************************************


	***********************************************************/
  function configEditor() {
    //set back fields
    app.passEditor.backFields.set();

    //init all objects
    for (var key in app.passEditor) {
      if (app.passEditor[key].hasOwnProperty('init')) {
        app.passEditor[key].init();
      }
    }

    //set color sliders to match keydoc
    app.passEditor.colors.updateSliders();

    app.passEditor.barcode.update();

    //setup location data
    app.passEditor.location.update();
  }

  /***********************************************************


	***********************************************************/
  function create(jsonData) {

    d3.json('/api/v1/passes')
      .header("Content-Type", "application/json")
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .post(JSON.stringify(jsonData), requestHandler);


  }

  /***********************************************************


  	***********************************************************/
  function update(passId, jsonData) {

    d3.json('/api/v1/passes/' + passId)
      .header("Content-Type", "application/json")
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .send('PATCH', JSON.stringify(jsonData), requestHandler);

  }

  /***********************************************************
	  Since both patch and post have the same reply, lets reuse them

	***********************************************************/
  function requestHandler(error, data) {

    if (app.toolkit.checkLoadError(error)) return;

    console.log(data);
    app.passEditor.template().id = data.id;
    app.passEditor.template().updated = data.time;
    app.savePassModelList(); //save the state of the list to storage
    app.toolkit.alertDisplay('saved', 'All changes have been successfully saved.');

  }

  /***********************************************************


  	***********************************************************/
  function onNextPage() {
    //$('.main').moveDown();
    onePageScroll.moveDown('.main');
  }

  /***********************************************************


  	***********************************************************/
  function onSelectType() {

    console.log('selectpass');

    var id = d3.select(this).attr('id');
    console.log(id);
    passType = id;

    var svgObj = d3.select('svg');
    if (!svgObj.empty()) {
      console.log('clear pass');
      //passTemplate = null; //clear data
      app.delPassModel(app.getNumPassModel()); //FIXME: sometimes not last?
      d3.select('svg.front').remove();
    }

    var url = '/accounts/template/' + passType;
    var uri = encodeURI(url);
    console.log(uri);
    $('div.spinner').show(); //show spinner

    d3.json(uri)
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .get(function(error, data) {

        if (error) {
          console.warn(error.statusText);
          app.toolkit.alertDisplay('error', error.statusText);
          return;
        }

        //add data to pass model list and activate it as the current build pass
        console.log(data);
        data.id = ""; //should already be clear
        app.addPassModel(data); //passTemplate = data; //store json pass template object
        app.setPassActive('#front-content', app.getNumPassModel() - 1)
        app.toolkit.loadSVG(passType, onFrontSVGLoad);

        $('div.spinner').hide(); //show spinner
        $('#next-button').show(); //show next arrow

      });
  }

  /***********************************************************

	 //callback for load of an svg element check for errors
	 ***********************************************************/
  var onSVGLoad = function(error, xml) {

    if (xml != undefined) {
      var svgid = d3.select(xml.documentElement).attr('id');
      if (svgid == 'passBack') {
        d3.select('div#back-content').node().appendChild(xml.documentElement);
      } else {
        d3.select('div#front-content').node().createShadowRoot().appendChild(xml.documentElement);
      }
      return true;
    } else {
      alertDisplay('error', error);
      return false;
    }


  }

  /***********************************************************

	 callback for load of the Front SVG element and init the pass
	 ***********************************************************/
  var onFrontSVGLoad = function(error, xml) {

      if (onSVGLoad(error, xml)) {
        initEditor();
      }

    }
    /***********************************************************


    ***********************************************************/
  function addSwipeEvent() {

      if (!window.matchMedia("(min-width: 48em)").matches) {

        var swipeEl = d3.select('section.active div.pure-g').node();

        console.log(swipeEl);
        app.toolkit.swipeEvents(swipeEl);

        var sLeft = function(event) {
          console.log("LEFT");
          event.preventDefault();
          moveLeft(swipeEl);

        }
        document.removeEventListener('swipeLeft', sLeft);
        document.addEventListener('swipeLeft', sLeft);

        var sRight = function(event) {
          event.preventDefault();
          moveRight(swipeEl);
        }

        document.removeEventListener('swipeRight', sRight);
        document.addEventListener('swipeRight', sRight);
      }

    }
    /***********************************************************


    ***********************************************************/
  function moveLeft(swipeEl) {

      //get the transform height for the pass content
      var st = window.getComputedStyle(d3.select('div.fake-content').node(), null);
      var tr = st.getPropertyValue("-webkit-transform") ||
        st.getPropertyValue("-moz-transform") ||
        st.getPropertyValue("-ms-transform") ||
        st.getPropertyValue("-o-transform") ||
        st.getPropertyValue("transform");

      var matrix = tr.match(/[0-9., -]+/)[0].split(", ");
      var transY = matrix[matrix.length - 1];
      console.log(matrix);

      d3.select(swipeEl).attr('style', 'transform: translate3d(-120%, 0, 0); ');
      d3.select('div.fake-content').attr('style', 'transition: all 0.5s; transform:translate3d(-120%,' + transY + 'px, 0) !important;')
    }
    /***********************************************************


    ***********************************************************/
  function moveRight(swipeEl) {
    d3.select('div.fake-content')
      .attr('style', null)
      .attr('style', 'transition: all 0.5s');
    d3.select(swipeEl).attr('style', null);
  }

  /***********************************************************


	***********************************************************/
  function passStatus(currentPage) {

    if (app.passEditor.template().status == "ready" || app.passEditor.template().status == "api") {
      return app.passEditor.template().status;
    }

    var statusNum = parseInt(app.passEditor.template().status, 10);
    if (statusNum == NaN) {
      return "0";
    }

    //only set the highest page completion value in the template
    if (statusNum >= currentPage) {
      return app.passEditor.template().status;
    }
    //all pages have been set, pass should be complete. Share should always be the last page
    if (currentPage >= app.passEditor.share.index() - 1) {
      if (app.passEditor.template().mutatelist && app.passEditor.template().mutatelist.length > 0) { //submit the api mutate variable list if it exists.
        return "api";
      }
      return "ready";
    }

    return (currentPage).toString();

  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  app.passEditor = {

    init: function() {
      init();
    },

    build: function() {
      buildPass();
    },
    editor: function() {
      initEditor();
    },
    create: function(jsonData) {
      create(jsonData);
    },

    update: function(passId, jsonData) {
      update(passId, jsonData)
    },

    svg: function() {
      return app.getSvgRoot();
    },

    template: function() {
      return app.getPassModel();
    },

    passType: function() {
      return app.getPassModel().passtype;
    },

    status: function(page) {
      return passStatus(page)
    }
  };


}(passNinja = window.passNinja || {}, jQuery));

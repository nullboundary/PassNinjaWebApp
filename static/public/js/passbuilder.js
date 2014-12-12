(function (passBuilder, $, undefined) {

  'use strict';

  var pageBeforeIndex,
    pageAfterIndex,
    passType,
    passTemplate; //a json object containing all the pass data for this pass



  /*
    var passBuilder = {
      'passSelector': {
        index: 1,
      },
      'getStarted': {
        index: 2,
        submit: getStartedSubmit,
        save: getStartedSave
      },
      'sign': {
        index: 11,
      },
      'share': {
        index: 12,
      }
    }; */


  /***********************************************************


 	***********************************************************/
  function init() {

    var w = 500,
      h = 600,
      svg = d3.select('svg'),
      currentEditTarget, //which text field is being edited
      targetGroupId;

    passType = 'none';

    var token = window.localStorage.getItem('token');
    if (token) {
      $.ajaxSetup({
        headers: {
          "Authorization": "Bearer " + token
        }
      });
    }

    //init all objects
    for (var key in passBuilder) {
      if (passBuilder[key].hasOwnProperty('init')) {
        passBuilder[key].init();
      }
    }

    //init all color sliders for page 2
    //passBuilder.colors.init();


    /*

        //setup barcode selection
        builderPages['barcode'] = passBuilder.barcode; //.init();

        //setup text fields
        passBuilder.fields.init();

        //setup back text fields
        passBuilder.backFields.init();

        passBuilder.location.init();
    */

    //setup one page scroll
    $('.main').onepage_scroll({
      sectionContainer: 'section',
      updateURL: false,
      responsiveFallback: false,
      pagination: true,
      keyboard: true,
      direction: 'vertical',
      loop: false,
      beforeMove: onBeforeScroll,
      afterMove: onAfterScroll
    });

    //don't submit form for popover tip selection buttons
    $(document).on('click', '.select-button', function (e) {
      e.preventDefault();
      //var btn = $(this);
      //if (btn.val())
    });

    //Select PassType
    $(document).on('click', '.pass-thumb-select', onSelectType);

    //Click Next Page Button
    $(document).on('click', '#next-button', onNextPage);

    //prevent enter submit for all forms!
    $('form.pure-form').on("keyup keypress", function (e) {
      var code = e.keyCode || e.which;
      if (code == 13) {
        e.preventDefault();
        return false;
      }
    });

    //  d3.select('#pass-name').on('input', getStartedSubmit);
    //d3.select('#pass-desc').on('input', getStartedSubmit);
    //  d3.select('#org-name').on('input', getStartedSubmit);

    //only load back if you haven't already
    if (d3.select('svg.back').empty()) {
      loadSVG('back', onSVGLoad); //load the back svg
    }



  }

  /***********************************************************


 	***********************************************************/
  function onBeforeScroll(index) {



      if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

        passBuilder.colors.resetRectStroke(); //reset all rect stroke to none

        pageBeforeIndex = index;
        console.log('before ' + index);

        for (var key in passBuilder) {

          if (passBuilder[key].hasOwnProperty('index')) {

            if (passBuilder[key].index() + 1 == index) { //match index of object to page scroll page index

              console.log(passBuilder[key].name());

              if (passBuilder[key].hasOwnProperty('save')) { //save object data to server
                passBuilder[key].save(index);
              }

              if (passBuilder[key].hasOwnProperty('stroke')) { //change stroke color of rects (some pages)
                passBuilder[key].stroke();
              }
            }
          }
        }
        /*
                if (index == 2) {
                  if (passType == 'none') {
                    console.log('moveTo:' + index);
                    $('.main').moveTo(index - 1);
                    alertDisplay("error", "Please select a type of pass to build");
                  }
                } else if (index == 3) { //page 2 is get started

                } else if (index == 4) { //page 3 is colors
                  passBuilder.colors.save();
                } else if (index == 5) {

                  passBuilder.colors.save();
                  //  $(".main").moveTo(index - 1);
                } else if (index == 6) {
                  passBuilder.barcode.save(index);
                }

              } else if (index == 8) { //text boxes
                passBuilder.colors.updateRectStroke('rect.text-btn-rect');
              } else if (index == 9) {
                //passBuilder.location.xray(false);
              }
        */

      }
    }
    /***********************************************************


 	***********************************************************/
  function onAfterScroll(index) {

      if (pageAfterIndex != index) { //prevent handler being called twice per scroll.
        pageAfterIndex = index;
        console.log('after ' + index);

        for (var key in passBuilder) {
          if (passBuilder[key].hasOwnProperty('index')) {

            if (passBuilder[key].index() == index) { //match index of object to page scroll page index

              console.log('after: ' + passBuilder[key].name());

              if (passBuilder[key].hasOwnProperty('xray')) {
                passBuilder[key].xray(true);
              }
              if (passBuilder[key].hasOwnProperty('handler')) {
                passBuilder[key].handler();
              }
            }
          }
        }


        /*
              if (index == 3) { //color adjust page

              } else if (index == 5) {

              } else if (index == 6) { //set image popover


              } else if (index == 7) {

              } else if (index == 9) { //set text input popover

                //add handlers for panning (scrolling) of svg back field data
                passBuilder.backFields.addHandlers();
                passBuilder.location.xray(false);

              } else if (index == 10) {
                passBuilder.location.xray(true);
              } else if (index == 11) {
                passBuilder.location.xray(false);
              }
        */

      }
    }
    /***********************************************************


 	***********************************************************/
  function getStartedSubmit() {

    var orgName = $('#org-name').val();
    var passName = $('#pass-name').val().replace(/\s|\./g, '').toLowerCase();
    var passDesc = $('#pass-desc').val();

    passTemplate.name = passName;
    passTemplate.keyDoc.description = passDesc;
    passTemplate.keyDoc.organizationName = orgName;


  }

  /***********************************************************


  ***********************************************************/
  function getStartedSave(index) {

      getStartedSubmit();

      console.log(passTemplate.name);
      if (passTemplate.name == "") {
        $('.main').moveTo(index - 1);
        alertDisplay("error", "Please fill out the required field");
        $('#pass-name').focus();
        return;
      }
      if (passTemplate.keyDoc.organizationName == "") {
        $('.main').moveTo(index - 1);
        alertDisplay("error", "Please fill out the required field");
        $('#org-name').focus();
        return;
      }


      var passData = {
        'name': passTemplate.name,
        'status': passStatus(passBuilder.startPage.index()),
        'keyDoc': {
          'description': passTemplate.keyDoc.description,
          'organizationName': passTemplate.keyDoc.organizationName
        }
      };

      create(passData);

      //passBuilder.update(passTemplate.id, passData);

    }
    /***********************************************************
 		Build a new SVG pass representation from the data

 	***********************************************************/
  function initNewPass() {

    //passTemplate
    console.log('passType ' + passType);

    passBuilder.image.set();

    passBuilder.barcode.set();

    passBuilder.fields.set(passTemplate.keyDoc[passType].primaryFields, 'primary');
    passBuilder.fields.set(passTemplate.keyDoc[passType].headerFields, 'header'); //set header fields
    passBuilder.fields.set(passTemplate.keyDoc[passType].secondaryFields, 'second'); //set secondary fields
    passBuilder.fields.set(passTemplate.keyDoc[passType].auxiliaryFields, 'aux'); //set auxiliary fields

    //keydoc top level
    passBuilder.fields.setLogo();


    //set color sliders to match keydoc
    passBuilder.colors.updateSliders();

    //set bg gradiant color
    passBuilder.colors.updateBg();

    //set text color
    passBuilder.colors.updateText();

    //set back fields
    passBuilder.backFields.set();

    passBuilder.location.update();

  }

  /***********************************************************


  ***********************************************************/
  function create(jsonData) {
    var jqxhr = $.post('/accounts/passes/', JSON.stringify(jsonData));
    requestHandlers(jqxhr);
  }

  /***********************************************************


 	***********************************************************/
  function update(passId, jsonData) {

    //save pass data on server for each field update
    //var jqxhr = $.post('/accounts/save', JSON.stringify(jsonData))

    var jqxhr = $.ajax({
      url: '/accounts/passes/' + passId,
      data: JSON.stringify(jsonData),
      type: 'PATCH',
      contentType: 'application/json',
      processData: false,
      dataType: 'json'
    });

    requestHandlers(jqxhr);

  }

  /***********************************************************
    Since both patch and post have the same reply, lets reuse them

  ***********************************************************/
  function requestHandlers(jqxhr) {

    jqxhr.done(function (data) {

        console.log(data);
        passTemplate.id = data.id;
        passTemplate.updated = data.time;
        alertDisplay('saved', 'All changes have been successfully saved.');

      })
      .fail(function (jqXHR) {

        var error = jQuery.parseJSON(jqXHR.responseText); //parse json
        alertDisplay('error', error.error);

      })
      .always(function () {

      });

  }

  /***********************************************************


 	***********************************************************/
  function onNextPage(event) {
    $('.main').moveDown();
  }

  /***********************************************************


 	***********************************************************/
  function onSelectType(event) {

    console.log('selectpass');

    var id = $(event.target).attr('id');
    console.log(id);
    passType = id;

    var svgObj = d3.select('svg');
    if (!svgObj.empty()) {
      console.log('clear pass');
      passTemplate = null; //clear data
      d3.select('svg.front').remove();
    }

    var url = '/accounts/template/' + passType;
    var uri = encodeURI(url);
    console.log(uri);
    $('div.spinner').show(); //show spinner

    var jqxhr = $.getJSON(uri)
      .done(function (data) {

        console.log(data);
        passTemplate = data; //store json pass template object
        passTemplate.id = ""; //a new pass needs a new id
        loadSVG(passType, onFrontSVGLoad);

        $('div.spinner').hide(); //show spinner
        $('#next-button').show(); //show next arrow

      })
      .fail(function (jqXHR) {

        var error = jQuery.parseJSON(jqXHR.responseText); //parse json
        alertDisplay('error', error.error());

      })
      .always(function () {

      });
  }

  /***********************************************************


 	***********************************************************/
  function loadSVG(passType, callback) {
    console.log('loadSVG');

    var url = '/assets/svg/' + passType + '.svg';
    var uri = encodeURI(url);
    console.log(uri);

    //load svg xml + place into document
    d3.xml(uri, 'image/svg+xml', callback);

  }

  /***********************************************************

   //callback for load of an svg element check for errors
   ***********************************************************/
  var onSVGLoad = function (error, xml) {

    if (xml != undefined) {
      d3.select('div.fake-content').node().appendChild(xml.documentElement);
      return true;
    } else {
      alertDisplay('error', error);
      return false;
    }


  }

  /***********************************************************

   callback for load of the Front SVG element and init the pass
   ***********************************************************/
  var onFrontSVGLoad = function (error, xml) {

    if (onSVGLoad(error, xml)) {
      initNewPass(); //setup template pass
    }

  }

  /***********************************************************


  ***********************************************************/
  function passStatus(currentPage) {

      if (passTemplate.status == "ready") {
        return passTemplate.status;
      }

      var statusNum = parseInt(passTemplate.status, 10);
      if (statusNum == NaN) {
        return "0";
      }

      //only set the highest page completion value in the template
      if (statusNum >= currentPage) {
        return passTemplate.status;
      }
      //all pages have been set, pass should be complete. Share should always be the last page
      if (currentPage >= passBuilder.sharePage.index() - 1) {
        return "ready";
      }

      return (currentPage).toString();

    }
    /***********************************************************

 	check browser locale support
	***********************************************************/
  function toLocaleStringSupportsLocales() {
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

  /***********************************************************



***********************************************************/
  function show() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].style('display', 'inline');
    }
  }

  /***********************************************************



***********************************************************/
  function hide() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].style('display', 'none');
    }
  }

  /***********************************************************



***********************************************************/
  function enable() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].attr('disabled', null);
    }
  }

  /***********************************************************



***********************************************************/
  function disable() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].attr('disabled', true);
    }
  }

  /***********************************************************

  check value input and set value property of selected input elem

  ***********************************************************/
  function setValue(selector, value) {
    if (value) {
      d3.select(selector)
        .property('value', value);
    }
  }

  /***********************************************************


 	***********************************************************/
  function alertDisplay(alertType, alertMessage) {

    //how long an alert is displayed
    var alertTimeout = 3500;
    var outHtml = '';
    var alertClass = 'alert-info';

    if (alertType == 'error') {
      alertClass = 'alert-error'; //red
      outHtml = '<i class="fa fa-frown-o"></i><strong>&nbsp; Error! &nbsp;</strong>'; //error style
    } else if (alertType == 'saved') {
      alertClass = 'alert-success'; //green
      outHtml = '<i class="fa fa-check-square-o"></i><strong>&nbsp; Saved! &nbsp;</strong>' //saved style
    }

    $('.alert')
      .attr('class', 'alert alert-dismissable ' + alertClass)
      .html(outHtml + alertMessage)
      .css('display', 'visible');

    setTimeout(function () {
      $('.alert').css('display', 'none');
    }, alertTimeout);
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  passBuilder.startPage = {
    name: function () {
      return 'getStarted';
    },
    index: function () {
      return 2;
    },
    submit: getStartedSubmit,
    save: function (index) {
      getStartedSave(index);
    }
  };

  passBuilder.sharePage = {
    name: function () {
      return 'share';
    },
    index: function () {
      return 12;
    },
  };


  /* Initialize the pass builder App */
  passBuilder.init = function () {
    init();
  };

  passBuilder.alertDisplay = function (alertType, alertMessage) {
    alertDisplay(alertType, alertMessage);
  };

  passBuilder.show = function () {
    show.apply(this, arguments);
  };

  passBuilder.hide = function () {
    hide.apply(this, arguments);
  };

  passBuilder.enable = function () {
    enable.apply(this, arguments);
  };

  passBuilder.disable = function () {
    disable.apply(this, arguments);
  };

  passBuilder.setValue = function (selector, value) {
    setValue(selector, value);
  }

  passBuilder.update = function (passId, jsonData) {
    update(passId, jsonData)
  };

  passBuilder.template = function () {
    return passTemplate;
  };

  passBuilder.passType = function () {
    return passType;
  };

  passBuilder.status = function (page) {
    return passStatus(page)
  };

  return passBuilder; //return the app object

}(passBuilder = window.passBuilder || {}, jQuery));

//seperate this out into a seperate file?
console.log(passBuilder);
passBuilder.init();

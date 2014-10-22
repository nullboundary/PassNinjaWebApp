(function (passBuilder, $, undefined) {

  'use strict';

  var pageBeforeIndex,
    pageAfterIndex,
    passType,
    passTemplate; //a json object containing all the pass data for this pass


  /***********************************************************


 	***********************************************************/
  function init() {

    var w = 500,
      h = 600,
      svg = d3.select("svg"),
      currentEditTarget, //which text field is being edited
      targetGroupId;

    passType = "coupon";

    //init all color sliders for page 2
    passBuilder.colors.init();

    //setup barcode selection
    passBuilder.barcode.init();

    //setup text fields
    passBuilder.fields.init();

    //setup back text fields
    passBuilder.backFields.init();

    passBuilder.location.init();


    //setup one page scroll
    $(".main").onepage_scroll({
      sectionContainer: "section",
      updateURL: false,
      responsiveFallback: false,
      pagination: true,
      keyboard: true,
      direction: "vertical",
      loop: false,
      beforeMove: onBeforeScroll,
      afterMove: onAfterScroll
    });

    //don't submit form for popover tip selection buttons
    $(document).on("click", ".select-button", function (e) {
      e.preventDefault();
      //var btn = $(this);
      //if (btn.val())
    });

    //Select PassType
    $(document).on("click", ".pass-thumb-select", onSelectType);

    //Click Next Page Button
    $(document).on("click", "#next-button", onNextPage);

    //only load back if you haven't already
    if (d3.select("svg.back").empty()) {
      loadSVG("back", onSVGLoad); //load the back svg
    }


  }

  /***********************************************************


 	***********************************************************/
  function onBeforeScroll(index) {



      if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

        passBuilder.colors.resetRectStroke(); //reset all rect stroke to none

        pageBeforeIndex = index;
        console.log("before " + index);
        if (index == 3) { //page 2 is get started
          getStartedSubmit();
        } else if (index == 4) { //page 3 is colors
          passBuilder.colors.save();
        } else if (index == 8) { //text boxes
          passBuilder.colors.updateRectStroke("rect.text-btn-rect");
        }


      }
    }
    /***********************************************************


 	***********************************************************/
  function onAfterScroll(index) {

      if (pageAfterIndex != index) { //prevent handler being called twice per scroll.
        pageAfterIndex = index;
        console.log("after " + index);

        if (index == 3) { //color adjust page

        } else if (index == 6) { //set image popover


        } else if (index == 7) {

        } else if (index == 9) { //set text input popover

          //add handlers for panning (scrolling) of svg back field data
          passBuilder.backFields.addHandlers();

        }

      }
    }
    /***********************************************************


 	***********************************************************/
  function getStartedSubmit() {

    var orgName = $("#org-name").val();
    var orgStr = orgName.replace(/\s|\./g, '').toLowerCase();
    var passName = $("#pass-name").val().replace(/\s|\./g, '').toLowerCase();
    var passDesc = $("#pass-desc").val();

    var passId = orgStr + "." + passName;


    passTemplate.id = "pass.ninja." + passId + "." + passType;
    passTemplate.keyDoc.description = passDesc;
    passTemplate.keyDoc.organizationName = orgName;


  }

  /***********************************************************
 		Build a new SVG pass representation from the data

 	***********************************************************/
  function initNewPass() {

    //passTemplate
    console.log("passType " + passType);

    passBuilder.image.set();

    passBuilder.barcode.set();

    passBuilder.fields.set(passTemplate.keyDoc[passType].primaryFields, "primary");
    passBuilder.fields.set(passTemplate.keyDoc[passType].headerFields, "header"); //set header fields
    passBuilder.fields.set(passTemplate.keyDoc[passType].secondaryFields, "second"); //set secondary fields
    passBuilder.fields.set2(passTemplate.keyDoc[passType].auxiliaryFields, "aux"); //set auxiliary fields

    //keydoc top level
    $("text.logo-text").text(passTemplate.keyDoc.logoText);

    //set color sliders to match keydoc
    passBuilder.colors.updateSliders();

    //set bg gradiant color
    passBuilder.colors.updateBg();

    //set text color
    passBuilder.colors.updateText();

    //set back fields
    passBuilder.backFields.set();

  }

  /***********************************************************


 	***********************************************************/
  function postUpdate(jsonData) {

    //save pass data on server for each field update
    var jqxhr = $.post("/accounts/save", JSON.stringify(jsonData))
      .done(function () {

        alertDisplay("saved", "All changes have been successfully saved.");

      })
      .fail(function (jqXHR) {

        var error = jQuery.parseJSON(jqXHR.responseText); //parse json
        alertDisplay("error", error.error);

      })
      .always(function () {

      });
  }

  /***********************************************************


 	***********************************************************/
  function onNextPage(event) {
    $(".main").moveDown();
  }

  /***********************************************************


 	***********************************************************/
  function onSelectType(event) {

    console.log("selectpass");

    var id = $(event.target).attr('id');
    console.log(id);
    passType = id;

    var svgObj = d3.select("svg");
    if (!svgObj.empty()) {
      console.log("clear pass");
      passTemplate = null; //clear data
      d3.select("svg.front").remove();
    }

    var url = "/accounts/template/" + passType;
    var uri = encodeURI(url);
    console.log(uri);
    $("div.spinner").show(); //show spinner

    var jqxhr = $.getJSON(uri)
      .done(function (data) {

        console.log(data);
        passTemplate = data; //store json pass template object
        loadSVG(passType, onFrontSVGLoad);

        $("div.spinner").hide(); //show spinner
        $("#next-button").show(); //show next arrow

      })
      .fail(function (jqXHR) {

        var error = jQuery.parseJSON(jqXHR.responseText); //parse json
        alertDisplay("error", error.error());

      })
      .always(function () {

      });
  }

  /***********************************************************


 	***********************************************************/
  function loadSVG(passType, callback) {
    console.log("loadSVG");

    var url = "/accounts/assets/svg/" + passType + ".svg";
    var uri = encodeURI(url);
    console.log(uri);

    //load svg xml + place into document
    d3.xml(uri, "image/svg+xml", callback);

  }

  /***********************************************************

   //callback for load of an svg element check for errors
   ***********************************************************/
  var onSVGLoad = function (error, xml) {

    if (xml != undefined) {
      d3.select("div.fake-content").node().appendChild(xml.documentElement);
      return true;
    } else {
      alertDisplay("error", error);
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

 	check browser locale support
	***********************************************************/
  function toLocaleStringSupportsLocales() {
    if (window.Intl && typeof window.Intl === "object") {
      return true;
    } else {
      $.getScript("/assets/js/Intl.min.js")
        .done(function (script, textStatus) {
          console.log(textStatus);
        })
        .fail(function (jqxhr, settings, exception) {
          alertDisplay("error", 'problem loading Intl.min.js');
        });
      return false;
    }

    //var number = 0;
    //try {
    //	number.toLocaleString("i");
    //} catch (e) {
    //	return e​.name === "RangeError";
    //}
    //return false;
  }


  /***********************************************************


 	***********************************************************/
  function alertDisplay(alertType, alertMessage) {

    //how long an alert is displayed
    var alertTimeout = 3500;
    var outHtml = '';
    var alertClass = 'alert-info';

    if (alertType == "error") {
      alertClass = 'alert-error'; //red
      outHtml =
        '<i class="fa fa-frown-o"></i></i><strong>&nbsp; Error! &nbsp;</strong>'; //error style
    } else if (alertType == "saved") {
      alertClass = 'alert-success'; //green
      outHtml =
        '<i class="fa fa-check-square-o"></i><strong>&nbsp; Saved! &nbsp;</strong>' //saved style
    }

    $(".alert")
      .attr('class', 'alert alert-dismissable ' + alertClass)
      .html(outHtml + alertMessage)
      .css('display', 'visible');

    setTimeout(function () {
      $(".alert").css('display', 'none');
    }, alertTimeout);
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  /* Initialize the pass builder App */
  passBuilder.init = function () {
    init();
  };

  passBuilder.alertDisplay = function (alertType, alertMessage) {
    alertDisplay(alertType, alertMessage);
  };

  passBuilder.update = function (jsonData) {
    postUpdate(jsonData);
  };

  passBuilder.template = function () {
    return passTemplate;
  };

  passBuilder.passType = function () {
    return passType;
  };

  return passBuilder; //return the app object

}(passBuilder = window.passBuilder || {}, jQuery));

//seperate this out into a seperate file?
console.log(passBuilder);
passBuilder.init();

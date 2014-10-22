(function (pb, $, undefined) {

  'use strict';

  /***********************************************************


 	***********************************************************/
  function init() {

    //setup all color sliders
    configColorSlider(".rgb-label", ".label-text");
    configColorSlider(".rgb-value", ".value-text");
    configColorSlider(".rgb-background", ".pass-bg");
  }

  /***********************************************************


 	***********************************************************/
  function configColorSlider(sliderClass, changeClass) {

    var colorValue = $(changeClass).css("fill");

    $(sliderClass).ColorPickerSliders({
      flat: true,
      swatches: false,
      color: colorValue,
      order: {
        rgb: 1,
        preview: 2
      },
      onchange: function (container, color) {

        if (changeClass == ".pass-bg") { //adjust values gradiant in pass background

          d3.select(".pass-bg-lite").style("stop-color", color.tiny.brighten(15).toRgbString());
          d3.select(changeClass).style("stop-color", color.tiny.toRgbString());
          d3.select(".pass-bg-dark").style("stop-color", color.tiny.darken(15).toRgbString());

        } else { //adjust values of all the other classes
          d3.selectAll(changeClass).style("fill", color.tiny.toRgbString());
        }

      },
      labels: {
        rgbred: 'Red',
        rgbgreen: 'Green',
        rgbblue: 'Blue'
      }
    });
  }

  /***********************************************************

 	set color sliders to match keydoc
 	***********************************************************/
  function updateSliders() {


    $(".rgb-label").trigger("colorpickersliders.updateColor", pb.template().keyDoc.labelColor);
    $(".rgb-value").trigger("colorpickersliders.updateColor", pb.template().keyDoc.foregroundColor);
    $(".rgb-background").trigger("colorpickersliders.updateColor", pb.template().keyDoc.backgroundColor);

  }

  /***********************************************************

 	set bg gradiant color of svg
 	***********************************************************/
  function updateBg() {

    //set bg gradiant color
    var bgColor = tinycolor(pb.template().keyDoc.backgroundColor);

    d3.select(".pass-bg-lite").style("stop-color", bgColor.brighten(15).toRgbString());
    d3.select(".pass-bg").style("stop-color", bgColor.toRgbString());
    d3.select(".pass-bg-dark").style("stop-color", bgColor.darken(15).toRgbString());



  }

  /***********************************************************

 	set text color
 	***********************************************************/
  function updateText() {

    console.log(d3.select(".value-text").style("fill"));
    d3.selectAll(".value-text").style("fill", pb.template().keyDoc.foregroundColor);
    d3.selectAll(".label-text").style("fill", pb.template().keyDoc.labelColor);
  }


  /***********************************************************


 	***********************************************************/
  function updateRectStroke(selection) {

    //set rect stroke color
    var bgColor = tinycolor(pb.template().keyDoc.backgroundColor);

    if (bgColor.isDark()) {
      d3.selectAll(selection).style("stroke", "#fff");
    } else {
      d3.selectAll(selection).style("stroke", "#000");

    }

    //d3.selectAll(selection).style("stroke", bgColor.complement().greyscale().toHexString());

  }

  function resetRectStroke() {

    //reset text rect stroke color
    d3.selectAll("rect.text-btn-rect").style("stroke", null);
    //reset image rect stroke color
    d3.selectAll("rect.img-btn-rect").style("stroke", null);
  }


  /***********************************************************


 	***********************************************************/
  function onColorSave() {

    console.log("colorSave");

    var bgColor = $(".pass-bg").css("stop-color");
    var labelColor = $(".label-text").css("fill");
    var valueColor = $(".value-text").css("fill");

    //set colors in keyDoc
    pb.template().keyDoc.foregroundColor = valueColor;
    pb.template().keyDoc.labelColor = labelColor;
    pb.template().keyDoc.backgroundColor = bgColor;


    var passData = {
      "id": pb.template().id,
      "keyDoc": {
        "labelColor": labelColor,
        "foregroundColor": valueColor,
        "backgroundColor": bgColor
      }
    };

    passBuilder.update(passData);

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.colors = {

    /* setup and configure color sliders */
    init: function () {
      init();
    },

    /* update sliders match pass colors */
    updateSliders: function () {
      updateSliders();
    },

    /* update background gradiant match pass json data */
    updateBg: function () {
      updateBg();
    },

    /* update text color match pass json data */
    updateText: function () {
      updateText();
    },

    updateRectStroke: function (selection) {
      updateRectStroke(selection);
    },

    resetRectStroke: function () {
      resetRectStroke();
    },

    /* save color data to server */
    save: function () {
      onColorSave();
    }

  };



  //return passColors; //return the colors object

}(passBuilder = window.passBuilder || {}, jQuery));
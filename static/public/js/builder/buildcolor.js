(function (tk, pb, $, undefined) {

  'use strict';

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.colors = {

    /***********************************************************
     update background gradiant match pass json data
     ***********************************************************/
    updateBg: function () {

      //set bg gradiant color
      var bgColor = tinycolor(pb.template().keyDoc.backgroundColor);
      console.log(bgColor.toRgbString());
      pb.svg().select('.pass-bg-lite').style('stop-color', bgColor.brighten(15).toRgbString());
      pb.svg().select('.pass-bg').style('stop-color', bgColor.toRgbString());
      pb.svg().select('.pass-bg-dark').style('stop-color', bgColor.darken(15).toRgbString());

    },

    /***********************************************************
    update text color match pass json data
    ***********************************************************/
    updateText: function () {
      console.log(pb.svg().select('.value-text').style('fill'));
      pb.svg().selectAll('.value-text').style('fill', pb.template().keyDoc.foregroundColor);
      pb.svg().selectAll('.label-text').style('fill', pb.template().keyDoc.labelColor);
    },

    name: function () {
      return 'colors';
    },


  };



}(passNinja.toolkit, passBuilder = passNinja.passBuilder || {}, jQuery));

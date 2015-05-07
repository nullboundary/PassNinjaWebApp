(function(app, undefined) {

  'use strict';

  /***********************************************************
  buildPass makes a new SVG pass representation from the data

  ***********************************************************/
  function buildPass() {

    //passTemplate
    console.log('passType ' + app.passBuilder.passType());

    app.passBuilder.image.set(); //load images into pass

    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].primaryFields, 'primary');
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].headerFields, 'header'); //set header fields
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].secondaryFields, 'second'); //set secondary fields
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].auxiliaryFields, 'aux'); //set auxiliary fields

    app.passBuilder.fields.setLogo(); //keydoc top level

    app.passBuilder.barcode.set(); //add barcode

    app.passBuilder.colors.updateBg(); //set bg gradiant color
    app.passBuilder.colors.updateText(); //set text color

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  app.passBuilder = {

    build: function() {
      buildPass();
    },
    svg: function() {
      return app.getSvgRoot();
    },
    template: function() {
      return app.getPassModel();
    },
    passType: function() {
      return app.getPassModel().passtype;
    }
  };


}(passNinja = window.passNinja || {}));

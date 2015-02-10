(function (app,tk, pb, $, undefined) {

  'use strict';

  /***********************************************************


 	***********************************************************/
  function init() {

      //handle selection of barcode format
      d3.select('select#bar-format')
        .on('input', onBarcodeSelect);

      //handle input of alt Text message
      d3.select('input#bar-alt')
        .on('input', onAltText);
    }

  /***********************************************************


 	***********************************************************/
  function onBarcodeSubmit() {

    console.log('onBarcode');

    //get input box values
    var barData = $('#bar-message').val();
    var barEncode = $('#bar-encode').val();
    var barType = $('#bar-format').val();
    var alt = $('#bar-alt').val();


    //TODO: set only fields that are not ""
    if (pb.template().keyDoc.barcode && barType != 'None') {
      pb.template().keyDoc.barcode.format = barType;
      pb.template().keyDoc.barcode.message = barData;
      pb.template().keyDoc.barcode.messageEncoding = barEncode;
      pb.template().keyDoc.barcode.altText = alt;

    } else {
      delete pb.template().keyDoc.barcode;
    }



  }

  /***********************************************************


 	***********************************************************/
  function onAltText() {

    var barcode = $('select#bar-format').val();
    var altValue = this.value; //get the alt text input box value


    if (altValue.length) {
      pb.template().keyDoc.barcode.altText = altValue;
    } else {
      delete pb.template().keyDoc.barcode.altText; //remove it from the keydoc
    }

    //setAltText(barcode);
    app.passBuilder.barcode.set();

  }

  /***********************************************************


 	***********************************************************/
  function onBarcodeSelect() {

    if (this.value == 'None') {
      delete pb.template().keyDoc.barcode;
      tk.disable(d3.select('input#bar-alt'), d3.select('input#bar-message'), d3.select('input#bar-encode'));
    } else {
      tk.enable(d3.select('input#bar-alt'), d3.select('input#bar-message'), d3.select('input#bar-encode'));

      //barcode was deleted: (set to none before)
      if (pb.template().keyDoc.barcode == undefined) {
        pb.template().keyDoc.barcode = {}; //add new barcode object
      }
      pb.template().keyDoc.barcode.format = this.value;
      app.passBuilder.barcode.set();
    }

  }

  /***********************************************************


  ***********************************************************/
  function updateInputs() {

    var barcode = pb.template().keyDoc.barcode;
    if(barcode){

      tk.enable(d3.select('input#bar-alt'), d3.select('input#bar-message'), d3.select('input#bar-encode'));
      tk.setValue('input#bar-alt', barcode.altText);
      tk.setValue('input#bar-encode', barcode.messageEncoding);
      tk.setValue('input#bar-message', barcode.message);
      d3.select('select#bar-format').node().value = barcode.format; //set the selector

    } else {
      tk.disable(d3.select('input#bar-alt'), d3.select('input#bar-message'), d3.select('input#bar-encode'));
      d3.select('select#bar-format').node().value = 'None'; //set the selector
    }


  }

  /***********************************************************


  ***********************************************************/
  function onBarcodeSave(index) {

    console.log(pb.template().keyDoc.barcode);

    if (pb.template().keyDoc.barcode) {

      if (pb.template().keyDoc.barcode.message == "") {
        onePageScroll.moveBlock(true);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#bar-message').focus();

      } else if (pb.template().keyDoc.barcode.messageEncoding == "") {
        onePageScroll.moveBlock(true);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#bar-encode').focus();

      } else {
        onePageScroll.moveBlock(false);

        var passData = {
          'name': pb.template().name,
          'status': pb.status(pb.barcode.index()),
          'keyDoc': {
            'barcode': pb.template().keyDoc.barcode
          }
        };
        pb.update(pb.template().id, passData);
      }
    }



  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.barcode = {
    /* setup and configure barcode handlers */
    init: function () {
      init();
    },

    update: function () {
      updateInputs();
    },
    save: function (index) {
      onBarcodeSubmit();
      onBarcodeSave(index);
    },
    name: function () {
      return 'barcode';
    },

    index: function () {
      return 7;
    }
  };

}(window.passNinja,passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));

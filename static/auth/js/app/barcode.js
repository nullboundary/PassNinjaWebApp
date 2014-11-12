(function (pb, $, undefined) {

  'use strict';


  var setHighField,
    setLowField,
    prevState = 'rect', //Fields shifted up for Square barcode or not?
    setHighField = function setHighField() { //function shifts fields up to make room for square barcode

      if (prevState == 'rect') {
        setFieldPosition(-6, -16);
      }
    },
    setLowField = function setLowField() { //function shifts fields down

      if (prevState == 'square') {
        setFieldPosition(6, 16);
      }
    },
    barcodeShape = {
      'PDF417': {
        'format': 'PKBarcodeFormatPDF417',
        'fields': setLowField,
        'fieldState': 'rect',
        'x': 35,
        'y': 304,
        'width': 246,
        'height': 78,
        'image': {
          'width': 226,
          'height': 58,
          'path': '/accounts/assets/svg/img/pdf417.png'
        }
      },
      'QR': {
        'format': 'PKBarcodeFormatAztec',
        'fields': setHighField,
        'fieldState': 'square',
        'x': 81,
        'y': 240,
        'width': 153,
        'height': 153,
        'image': {
          'width': 133,
          'height': 133,
          'path': '/accounts/assets/svg/img/QR.png'
        }
      },
      'Aztec': {
        'format': 'PKBarcodeFormatQR',
        'fields': setHighField,
        'fieldState': 'square',
        'x': 81,
        'y': 240,
        'width': 153,
        'height': 153,
        'image': {
          'width': 133,
          'height': 133,
          'path': '/accounts/assets/svg/img/aztec.png'
        }
      }
    };

  /***********************************************************


 	***********************************************************/
  function init() {

      //handle selection of barcode format
      d3.select('select#barcode-format')
        .on('input', onBarcodeSelect);

      //handle input of alt Text message
      d3.select('input#popAlt')
        .on('input', onAltText);
    }
    /***********************************************************


 	***********************************************************/
  function setBarcode() {

    if (pb.template().keyDoc.barcode != null) {

      switch (pb.template().keyDoc.barcode.format) {
      case 'PKBarcodeFormatPDF417':
        setBarType('PDF417');
        break;
      case 'PKBarcodeFormatAztec':
        setBarType('Aztec');
        break;
      case 'PKBarcodeFormatQR':
        setBarType('QR');
        break;
      default:
        setNone();
        break;
      }

    } else {
      setNone();
    }
  }

  /***********************************************************


 	***********************************************************/
  function onBarcodeSubmit() {

    console.log('onBarcode');
    d3.event.preventDefault();

    //get input box values
    var barData = $('#popData').val();
    var barEncode = $('#popEncode').val();
    var barType = $('#barcode-format').val();



    if (barType != 'No Barcode') {
      pb.template().keyDoc.barcode.format = barcodeShape[barType].format;
      pb.template().keyDoc.barcode.message = barData;
      pb.template().keyDoc.barcode.messageEncoding = barEncode;

    } else {
      delete pb.template().keyDoc.barcode;
      //TODO: how do you add a barcode back after delete?
    }



  }

  /***********************************************************


 	***********************************************************/
  function onAltText() {

    var barcode = $('select#barcode-format').val();
    var altValue = this.value; //get the alt text input box value


    if (altValue.length) {
      pb.template().keyDoc.barcode.altText = altValue;
    } else {
      delete pb.template().keyDoc.barcode.altText; //remove it from the keydoc
    }

    //console.log(pb.template());

    setAltText(barcode);


  }

  /***********************************************************


 	***********************************************************/
  function setAltText(barType) {


      var altValue = pb.template().keyDoc.barcode.altText;

      if (altValue != undefined) {

        var barcodeRect = d3.select('g#barcode-group rect')
          .transition()
          .attr('height', (barcodeShape[barType].height + 10))
          .attr('y', -10);

        d3.select('g#barcode-group image')
          .transition()
          .attr('y', 0)

        var altText = d3.select('text#alt-text')
          .style('display', 'inline')
          .text(altValue);

        //center the alt text in the rect
        var textLength = altText.node().getComputedTextLength();
        var rectWidth = barcodeShape[barType].width;
        var xPos = (rectWidth / 2) - (textLength / 2);

        altText
          .attr('x', xPos)
          .attr('y', (barcodeShape[barType].height - 2));


      } else { //no alt text, set back to default


        d3.select('g#barcode-group rect')
          .transition()
          .attr('height', barcodeShape[barType].height)
          .attr('y', 0);

        d3.select('g#barcode-group image')
          .transition()
          .attr('y', 10);

        var passGroup = d3.select('text#alt-text')
          .style('display', 'none')
          .text(altValue);
      }
    }
    /***********************************************************


 	***********************************************************/
  function setBarType(barType) {


    barcodeShape[barType].fields(); //call function to shift text field for barcode space
    prevState = barcodeShape[barType].fieldState; //save state to use for next shift

    setBarGroup(barType); //set group attr

    //set rectangle
    d3.select('g#barcode-group rect')

    .attr('x', 0)
      .attr('y', 0)
      .attr('width', barcodeShape[barType].width)
      .attr('height', barcodeShape[barType].height);

    //set image
    d3.select('g#barcode-group image')
      .attr('x', 10)
      .attr('y', 10)
      .attr('width', barcodeShape[barType].image.width)
      .attr('height', barcodeShape[barType].image.height)
      .attr('xlink:href', barcodeShape[barType].image.path);

    setAltText(barType);

    //display
    d3.select('g#barcode-group').transition().style('display', 'inline');

    enableInputs();

  }

  /***********************************************************


 	***********************************************************/
  function setNone() {

      setLowField();
      prevState = 'rect';

      d3.select('g#barcode-group').transition().style('display', 'none');

      disableInputs();

    }
    /***********************************************************


 	***********************************************************/
  function setBarGroup(barType) {

    var xPos = barcodeShape[barType].x;
    var yPos = barcodeShape[barType].y

    var groupLoc = 'translate(' + xPos + ',' + yPos + ')';

    //set group
    d3.select('g#barcode-group')
      .attr('transform', groupLoc)
      .attr('width', barcodeShape[barType].width)
      .attr('height', barcodeShape[barType].height)
  }

  /***********************************************************


 	***********************************************************/
  function setFieldPosition(auxShift, secShift) {

    //select all aux text groups and subtract Y pos
    var aux = d3.selectAll('.auxiliaryFields');
    aux.each(function () {
      shiftField(this, auxShift);
    });

    //select all secondary text groups and subtract Y pos
    var second = d3.selectAll('.secondaryFields');
    second.each(function () {
      shiftField(this, secShift);
    });

  }

  /***********************************************************


 	***********************************************************/
  function shiftField(selection, amount) {

    var textGroup = d3.select(selection.parentNode);
    var translate = d3.transform(textGroup.attr('transform')).translate;
    var xPos = translate[0];
    var yPos = translate[1] + amount;
    textGroup.transition().attr('transform', 'translate(' + xPos + ',' + yPos + ')');

  }

  /***********************************************************


 	***********************************************************/
  function onBarcodeSelect() {

    if (this.value == 'No Barcode') {
      setNone();
    } else {
      setBarType(this.value);
    }

  }

  /***********************************************************


 	***********************************************************/
  function enableInputs() {

    //enable inputs
    d3.select('input#popAlt').attr('disabled', null);
    d3.select('input#popData').attr('disabled', null);
    d3.select('input#popEncode').attr('disabled', null);
  }

  /***********************************************************


 	***********************************************************/
  function disableInputs() {

    //disable inputs
    d3.select('input#popAlt').attr('disabled', true);
    d3.select('input#popData').attr('disabled', true);
    d3.select('input#popEncode').attr('disabled', true);

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

    set: function () {
      setBarcode();
    },

    save: function () {
      onBarcodeSubmit();
    }
  };

  //return passBarcode; //return the barcode object

}(passBuilder = window.passBuilder || {}, jQuery));

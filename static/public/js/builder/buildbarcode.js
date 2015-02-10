(function (tk, pb, $, undefined) {

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
    'PKBarcodeFormatPDF417': {
      'fields': setLowField,
      'fieldState': 'rect',
      'x': 35,
      'y': 304,
      'width': 246,
      'height': 78,
      'image': {
        'width': 226,
        'height': 58,
        'path': '/assets/svg/img/pdf417.png'
      }
    },
    'PKBarcodeFormatQR': {
      'fields': setHighField,
      'fieldState': 'square',
      'x': 81,
      'y': 240,
      'width': 153,
      'height': 153,
      'image': {
        'width': 133,
        'height': 133,
        'path': '/assets/svg/img/QR.png'
      }
    },
    'PKBarcodeFormatAztec': {
      'fields': setHighField,
      'fieldState': 'square',
      'x': 81,
      'y': 240,
      'width': 153,
      'height': 153,
      'image': {
        'width': 133,
        'height': 133,
        'path': '/assets/svg/img/aztec.png'
      }
    }
  };

  /***********************************************************


  ***********************************************************/
  function setBarType(barType) {


    barcodeShape[barType].fields(); //call function to shift text field for barcode space
    prevState = barcodeShape[barType].fieldState; //save state to use for next shift

    setBarGroup(barType); //set group attr

    //set rectangle
    pb.svg().select('g#barcode-group rect')

    .attr('x', 0)
    .attr('y', 0)
    .attr('width', barcodeShape[barType].width)
    .attr('height', barcodeShape[barType].height);

    //set image
    pb.svg().select('g#barcode-group image')
    .attr('x', 10)
    .attr('y', 10)
    .attr('width', barcodeShape[barType].image.width)
    .attr('height', barcodeShape[barType].image.height)
    .attr('xlink:href', barcodeShape[barType].image.path);

    setAltText(barType);

    //display
    pb.svg().select('g#barcode-group').transition().style('display', 'inline');

  }

  /***********************************************************


  ***********************************************************/
  function setNone() {

    setLowField();
    prevState = 'rect'; //save state to use for next shift
    pb.svg().select('g#barcode-group').transition().style('display', 'none');

  }

  /***********************************************************


  ***********************************************************/
  function setBarGroup(barType) {

    var xPos = barcodeShape[barType].x;
    var yPos = barcodeShape[barType].y

    var groupLoc = 'translate(' + xPos + ',' + yPos + ')';

    //set group
    pb.svg().select('g#barcode-group')
    .attr('transform', groupLoc)
    .attr('width', barcodeShape[barType].width)
    .attr('height', barcodeShape[barType].height)
  }

  /***********************************************************


  ***********************************************************/
  function setFieldPosition(auxShift, secShift) {

    //select all aux text groups and subtract Y pos
    var aux = pb.svg().selectAll('.auxiliaryFields');
    aux.each(function () {
      shiftField(this, auxShift);
    });

    //select all secondary text groups and subtract Y pos
    var second = pb.svg().selectAll('.secondaryFields');
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
  function setAltText(barType) {


    var altValue = pb.template().keyDoc.barcode.altText;

    if (altValue) {

      var barcodeRect = pb.svg().select('g#barcode-group rect')
      .transition()
      .attr('height', (barcodeShape[barType].height + 10))
      .attr('y', -10);

      pb.svg().select('g#barcode-group image')
      .transition()
      .attr('y', 0)

      var altText = pb.svg().select('text#alt-text')
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


      pb.svg().select('g#barcode-group rect')
      .transition()
      .attr('height', barcodeShape[barType].height)
      .attr('y', 0);

      pb.svg().select('g#barcode-group image')
      .transition()
      .attr('y', 10);

      var passGroup = pb.svg().select('text#alt-text')
      .style('display', 'none')
      .text(altValue);
    }
  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.barcode = {

    set: function () {
      var barcode = pb.template().keyDoc.barcode;

      if (barcode) {
        setBarType(barcode.format);
      } else {
        setNone();
      }
    },

    name: function () {
      return 'barcode';
    }
  };

}(passNinja.toolkit, passBuilder = passNinja.passBuilder || {}, jQuery));

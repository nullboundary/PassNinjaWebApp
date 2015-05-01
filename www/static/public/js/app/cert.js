(function (pb, $, undefined) {

  'use strict';

  /***********************************************************


  ***********************************************************/
  function init() {

    d3.select('select#cert-select')
      .on('input', onCertSelect);
  }

  /***********************************************************


  ***********************************************************/
  function onCertSelect() {

      pb.template().cert = this.value;


    }
    /***********************************************************


    ***********************************************************/
  function certSave() {

    if (pb.template().cert == undefined) {
      pb.template().cert = 'Pass Ninja certificate';
    }

    var passData = {
      'name': pb.template().name,
      'status': pb.status(pb.cert.index()),
      'cert': pb.template().cert,
    };

    pb.update(pb.template().id, passData);

  }
  /***********************************************************


  ***********************************************************/
  function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
  }

  function thumbnailSave() {

    //maybe its better to just save the whole svg file?
    console.log("thumbnail");

    d3.selectAll('rect.text-btn-rect').remove(); //remove selection rects

    var html = d3.select("svg.pass-template.front").node().parentNode.innerHTML;

    //var imgsrc = 'data:image/svg+xml;base64,'+ b64EncodeUnicode(html);
    var imgsrc = 'data:image/svg+xml;utf8,' + html;
    //var img = '<img src="'+imgsrc+'">';
    //d3.select("#image-svg-out").html(img);


    var canvas = d3.select('#image-out').node(),
      context = canvas.getContext("2d");
    //console.log(imgsrc);
    var image = new Image;
    image.src = imgsrc;
    image.onload = function () {
      context.drawImage(image, 0, 0);

      var canvasdata = canvas.toBlob(callback, "image/png");
      console.log(canvasdata);

      var pngimg = '<img src="' + canvasdata + '">';
      d3.select("#pngdataurl").html(pngimg);

      var a = document.createElement("a");
      a.download = "sample.png";
      a.href = canvasdata;
      a.click();
    };

  }

  function callback(blob) {

    console.log("callback");

    var newImg = document.createElement("img"),
      url = URL.createObjectURL(blob);

    //var pngimg = '<img src="'+fileHandle+'">';
    newImg.onload = function () {
      // no longer need to read the blob so it's revoked
      URL.revokeObjectURL(url);
    };
    newImg.src = url;
    //document.body.appendChild(newImg);
    d3.select("#pngdataurl").html(newImg);

    var a = document.createElement("a");
    a.download = "sample.png";
    a.href = fileHandle;
    a.click();
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.cert = {
    /* setup and configure barcode handlers */
    init: function () {
      init();
    },
    xray: function () {
      pb.location.xray(false);
    },
    save: function (index) {
      certSave(index);
    },
    name: function () {
      return 'cert';
    },

    index: function () {
      return 11;
    }
  };

}(passEditor = window.passEditor || {}, jQuery));

(function(pb, undefined) {

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

      //saveSVG();

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
  function saveSVG() {

    var svg = pb.svg();
    svg.selectAll('rect.text-btn-rect').remove(); //remove selection rects
    svg.selectAll('rect.img-btn-rect').remove();
    var svghtml = svg.node().innerHTML;
    var base64doc = btoa(unescape(encodeURIComponent(svghtml))),
      a = document.createElement('a'),
      e = document.createEvent("HTMLEvents");

    a.download = 'doc.svg';
    a.href = 'data:image/svg+xml;base64,' + base64doc;
    e.initEvent('click');
    a.dispatchEvent(e);

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.cert = {
    /* setup and configure barcode handlers */
    init: function() {
      init();
    },
    xray: function() {
      pb.location.xray(false);
    },
    save: function(index) {
      certSave(index);
    },
    name: function() {
      return 'cert';
    },

    index: function() {
      return 11;
    }
  };

}(this.passEditor = window.passEditor || {}));
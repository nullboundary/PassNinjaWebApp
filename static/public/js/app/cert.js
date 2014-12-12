(function (pb, $, undefined) {

  'use strict';

  /***********************************************************


  ***********************************************************/
  function init(){

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
      'cert': pb.template().cert
    };

    pb.update(pb.template().id,passData);

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

}(passBuilder = window.passBuilder || {}, jQuery));

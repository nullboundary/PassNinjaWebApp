(function (pb, $, undefined) {

  'use strict';

  /***********************************************************


  ***********************************************************/
  function handler(){

    var url = "/accounts/passes/"+pb.template().id+"/link"
    var uri = encodeURI(url);
    console.log(uri);

    $.get( uri, function( data ) {
      d3.select('#passurl')
      .property('href',data.url)
      .text(data.name);
    });

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.share = {
    /* setup and configure barcode handlers */
    handler: function () {
      handler();
    },
    name: function () {
      return 'share';
    },

    index: function () {
      return 12;
    }
  };

}(passBuilder = window.passBuilder || {}, jQuery));

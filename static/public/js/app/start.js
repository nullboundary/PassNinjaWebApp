(function (tk,pb, $, undefined) {

  'use strict';

  /***********************************************************


  ***********************************************************/
  function submitStart() {

    var orgName = $('#org-name').val();
    var passName = $('#pass-name').val().replace(/\s|\./g, '').toLowerCase();
    var passDesc = $('#pass-desc').val();

    pb.template().name = passName;
    pb.template().keyDoc.description = passDesc;
    pb.template().keyDoc.organizationName = orgName;


  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.startPage = {
    /* setup and configure barcode handlers */
//    handler: function () {
//      handler();
//    },
    name: function () {
      return 'getStarted';
    },

    index: function () {
      return 2;
    },
    submit: function () {

    },
    save: function (index) {
      submitStart();

      console.log(pb.template().name);
      if (pb.template().name == "") {
        $('.main').moveTo(index - 1);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#pass-name').focus();
        return;
      }
      if (pb.template().keyDoc.organizationName == "") {
        $('.main').moveTo(index - 1);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#org-name').focus();
        return;
      }


      var passData = {
        'name': pb.template().name,
        'status': pb.status(pb.startPage.index()),
        'passtype': pb.template().passtype,
        'keyDoc': {
          'description': pb.template().keyDoc.description,
          'organizationName': pb.template().keyDoc.organizationName
        }
      };

      pb.create(passData);
    }
  };

}(passNinja.toolkit, passBuilder = passNinja.passBuilder || {}, jQuery));

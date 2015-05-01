(function(tk, pb, $, undefined) {

  'use strict';

  function init() {

    if (pb.template().id != "") { //a new pass will have no id yet. Don't fill in template names.

      d3.select('input#pass-name').node().value = pb.template().name;
      d3.select('input#pass-desc').node().value = pb.template().keyDoc.description;
      d3.select('input#org-name').node().value = pb.template().keyDoc.organizationName;
    }

  }

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
    name: function() {
      return 'getStarted';
    },

    index: function() {
      return 2;
    },
    init: function() {
			init();
    },
    save: function(index) {
      submitStart();
      console.log(pb.template().name);
      if (pb.template().name == "") {
        console.log('save start ' + index);
        onePageScroll.moveBlock(true);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#pass-name').focus();
        return;
      }
      if (pb.template().keyDoc.organizationName == "") {
        onePageScroll.moveBlock(true);
        tk.alertDisplay("error", "Please fill out the required field");
        $('#org-name').focus();
        return;
      }

      onePageScroll.moveBlock(false);

			if (pb.template().id == "") {

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

		} else { //Updating an old pass

			var passData = {
				'name': pb.template().name,
				'keyDoc': {
					'description': pb.template().keyDoc.description,
					'organizationName': pb.template().keyDoc.organizationName
				}
			};
			pb.update(pb.template().id, passData);
		}



    }
  };

}(passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));

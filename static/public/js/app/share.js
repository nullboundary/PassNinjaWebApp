(function (tk, pb, $, undefined) {

  'use strict';

  /***********************************************************


  ***********************************************************/
  function handler() {

      if (pb.template().mutatelist) { //get the api mutate variable list if it exists.
        tk.hide(d3.select('#pass-qr'), d3.select('#pass-copy'), d3.select('#pass-link'));
        printMutateList(); //print the mutate list for developers to easily call api with correct values
      } else {
        tk.hide(d3.select('#pass-api'));
        getPassLink(); //get the link to a non mutatable pass
      }



    }
    /***********************************************************


    ***********************************************************/
  function printMutateList() {

      var apiData = {};
      var arrayLength = pb.template().mutatelist.length;
      for (var i = 0; i < arrayLength; i++) { //loop through list
        console.log(pb.template().mutatelist[i]);
        apiData[pb.template().mutatelist[i]] = "foobar"; //add each entry onto list
      }

      var curlText = "curl -X PATCH -d '" + JSON.stringify(apiData) + "'\\ https://pass.ninja/api/v1/passes/" + pb.template().id + "/link";

      d3.select('#pass-api').text(curlText); //write json variable list into code block
    }
    /***********************************************************


    ***********************************************************/
  function getPassLink() {

      var url = "/api/v1/passes/" + pb.template().id + "/link",
        uri = encodeURI(url);
      console.log(uri);

      d3.json(uri)
        .header("Authorization", "Bearer " + tk.getToken())
        .get(function (error, data) {

          if (tk.checkLoadError(error)) return;

          d3.select('#pass-link')
            .property('href', data.url)
            .text(data.name);

          d3.select('#pass-copy').node().value = data.url;

          //draw qr code
          var qrcode = new QRCode(d3.select('#pass-qr').node(), {
            text: data.url,
            width: 256,
            height: 256,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.Q
          });



        });
    }
    /***********************************************************


    ***********************************************************/
  function testMutatePass() {

    var apiData = {
      'primary1': "Crazy Bat",
      'aux1': "2",
      'aux4': "Fireside Bowl",
      'second3': "666"
    };

    var url = "/api/v1/passes/" + pb.template().id + "/link",
      uri = encodeURI(url);
    console.log(uri);

    var jqxhr = $.ajax({
      url: url,
      data: JSON.stringify(apiData),
      type: 'PATCH',
      contentType: 'application/json',
      processData: false,
      dataType: 'json'
    });

    jqxhr.done(function (data) {
      d3.select('#pass-link')
        .property('href', data.url)
        .text(data.name);

      d3.select('#pass-copy').node().value = data.url;
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

}(passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));

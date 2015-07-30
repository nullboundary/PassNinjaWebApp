(function(tk, pb, $, undefined) {

  'use strict';

  /***********************************************************


   ***********************************************************/
  function handler() {

      if (pb.template().status == "api") {

        //select api tab
        d3.select('input#sharetab4').property('checked', true);

        //disable other tabs
        d3.select('input#sharetab1').property('disabled', true);
        d3.select('input#sharetab2').property('disabled', true);
        d3.select('input#sharetab3').property('disabled', true);


        printMutateList(); //print the mutate list for developers to easily call api with correct values
      } else if (pb.template().status == "ready") {

        var url = "/api/v1/passes/" + pb.template().id + "/link";
        var uri = encodeURI(url);
        console.log(uri);

        d3.json(uri)
          .header("Authorization", "Bearer " + tk.getToken())
          .get(function(error, data) {

            if (tk.checkLoadError(error)) return;

            sharePass(data.url, data.name); //get the link to a non mutatable pass
            printEmbedCode(data.url);
            generateQR(data.url, data.name);


          });
      }
    }
    /***********************************************************


     ***********************************************************/
  function printMutateList() {

      var curlText = "API access not configured for this pass."

      if (pb.template().mutatelist) { //get the api mutate variable list if it exists.

        var apiData = {};
        var arrayLength = pb.template().mutatelist.length;
        for (var i = 0; i < arrayLength; i++) { //loop through list
          console.log(pb.template().mutatelist[i]);
          apiData[pb.template().mutatelist[i]] = "foobar"; //add each entry onto list
        }
        curlText = "curl -X PATCH -d '" + JSON.stringify(apiData) + "'\\ https://pass.ninja/api/v1/passes/" + pb.template().id + "/mutate";
      }

      d3.select('#pass-api').text(curlText) //write json variable list into code block
        .on('click', function() {
          this.focus();
          this.select();
        });

    }
    /***********************************************************


     ***********************************************************/
  function sharePass(passUrl, passName) {

      d3.select('#pass-copy')
        .property('value', passUrl)
        .on('click', function() {
          this.focus();
          this.select();
        });

      //setup share buttons
      var facebook = d3.select('.facebook');
      var href = facebook.property('href');
      facebook.property('href', href + encodeURIComponent(passUrl));

      var google = d3.select('.google');
      href = google.property('href');
      google.property('href', href + encodeURIComponent(passUrl));

      var twitter = d3.select('.twitter');
      href = twitter.property('href');
      //text=&url=&via=
      twitter.property('href', href + 'text=' + passName + '&url=' + encodeURIComponent(passUrl) + '&via=https://pass.ninja');

      var linkedin = d3.select('.linkedin');
      href = linkedin.property('href');
      //&url=&title=&summary=&source=
      linkedin.property('href', href + '&url=' + encodeURIComponent(passUrl) + '&title=' + passName + '&source=https://pass.ninja');

      var reddit = d3.select('.reddit');
      href = reddit.property('href');
      reddit.property('href', href + encodeURIComponent(passUrl));

      d3.select('#pass-link')
        .property('href', passUrl);
      //.text(passName);

    }
    /***********************************************************


     ***********************************************************/
  function printEmbedCode(passUrl) {

      d3.select('#share-embed').property('href', passUrl);
      var imgText = '<a href="' + passUrl + '"<img src=https://cdn.rawgit.com/passninja/passninja-badge/v0.1/Passbook_Badge.svg></a>';

      d3.select('#pass-badge')
        .text(imgText)
        .on('click', function() {
          this.focus();
          this.select();
        });


    }
    /***********************************************************


     ***********************************************************/
  function generateQR(passUrl, passName) {

    if (!d3.select('.qrcode-img').empty()) { //remove old image if exists
      d3.select('.qrcode-img').remove();
      d3.select('#pass-qr canvas').remove(); //remove old canvas used to generate image
    }

    //draw qr code
    var qrcode = new QRCode(d3.select('#pass-qr').node(), {
      text: passUrl,
      width: 1024,
      height: 1024,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.Q
    });

    var QRImg = d3.select('.qrcode-img').node();

    //when image src loaded, set <a href to data uri
    QRImg.onload = function() {
      var qrURI = d3.select('.qrcode-img').attr('src');
      console.log(qrURI);
      d3.select('#download-qr')
        .property('download', passName + '-qrcode.png')
        .property('href', qrURI);
    };
  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.share = {
    handler: function() {
      handler();
    },
    name: function() {
      return 'share';
    },

    index: function() {
      return 12;
    }
  };

}(passNinja.toolkit, this.passEditor = passNinja.passEditor || {}, jQuery));

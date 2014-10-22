(function (pb, $, undefined) {

  'use strict';

  /***********************************************************


 	***********************************************************/
  function setPassImages() {

    //- if image is not in the pb.template() data

    //- remove image from the svg template
    //- leave the group rectangle

    //- if image does exist in pb.template() data
    //- replace or add image to svg template

    var imageTypes = ["logo", "icon", "strip", "background", "footer", "thumbnail"];

    //diff contains what was in imageTypes[] that is not in pb.template().images[]
    var diff = $(imageTypes).not(pb.template().images).get();

    //remove all images from svg if they are part of the pass data
    for (var i = 0; i < diff.length; ++i) {
      var imageSelection = d3.select("g.img-btn-group #" + diff[i]);
      if (!imageSelection.empty()) { //remove it if its in the svg
        imageSelection.remove();
      }
    }

    if (pb.template().images != null) {
      //add or replace images that exist in data
      for (var index = 0; index < pb.template().images.length; ++index) {

        //select the image id. Example: g.img-btn-group #logo
        var imageSelection = d3.select("g.img-btn-group #" + pb.template().images[index].name);

        if (imageSelection.empty()) { //if group has no image, add image. svg images were removed above!

          //select th imageGroup specific to that image. Example: g.img-btn-group#logo-group
          var imageGroup = d3.select("g.img-btn-group#" + pb.template().images[index].name + "-group")

          if (!imageGroup.empty()) { //image group exists

            var rectWidth = imageGroup.select('rect.img-btn-rect').attr('width');
            var rectHeight = imageGroup.select('rect.img-btn-rect').attr('height');
            var rectX = imageGroup.select('rect.img-btn-rect').attr('x');
            var rectY = imageGroup.select('rect.img-btn-rect').attr('y');

            imageGroup
              .insert('image', 'rect.img-btn-rect')
              .attr('id', pb.template().images[index].name)
              .attr('xlink:href', pb.template().images[index].image)
              .attr('width', rectWidth)
              .attr('height', rectHeight)
              .attr('x', rectX)
              .attr('y', rectY);

            imageGroup.select('rect.img-btn-rect').on("click", onImageRectClick); //add event to rect

          } else {
            //TODO: some cases group doesn't exist! (eg thumbnail)
          }

        } else { //replace image

          //this doesn't seem to happen, not sure when it should?
          imageSelection.attr('xlink:href', pb.template().images[index].image);
          d3.select(imageSelection.parentNode + ' rect.img-btn-rect').on("click", onImageRectClick);
        }


      }
    }
  }

  /***********************************************************


 	***********************************************************/
  function checkImage() {

    //check whether browser fully supports all File API
    if (window.File && window.FileReader && window.FileList && window.Blob) {

      if (!$('#pop-image-input').val()) //check empty input field
      {
        pb.alertDisplay("error", 'no image selected');
        return false
      }

      var file = $('#pop-image-input')[0].files[0]; //get file
      var fsize = file.size; //get file size
      var ftype = file.type; // get file type


      //Allowed file size is less than 1 MB (1048576)
      if (fsize > 1048576) {

        pb.alertDisplay("error", 'Image file should be less than 1MB!');
        return false
      }

      return true; //success

    } else {

      //Output error to older unsupported browsers that doesn't support HTML5 File API
      pb.alertDisplay("error", 'Please upgrade your browser!');
      return false;
    }
  }

  /***********************************************************


 	***********************************************************/
  function checkImageSize(imageName, imageWidth, imageHeight) {

    var ratio = imageWidth / imageHeight;

    switch (imageName) {
    case "logo":

      if (imageWidth > 320 || imageHeight > 100) {
        return "Logo image should be 320px x 100px or less ";
      } else {
        return ""
      }

    case "icon":

      if (imageWidth > 152 || imageHeight > 152) {
        return "Icon image should be 152px x 152px or less ";
      } else {
        return ""
      }

    case "strip": //TODO: the are some variations based on passtype

      if (imageWidth > 640 || imageHeight > 246) {
        return "Strip image should be 640 x 246 or less ";
      } else {
        return ""
      }

    case "background":

      if (imageWidth > 360 || imageHeight > 440) {
        return "Background image should be 360px x 440px or less ";
      } else {
        return ""
      }

    case "footer":

      if (imageWidth > 572 || imageHeight > 30) {
        return "Footer image should be 572px x 30px or less ";
      } else {
        return ""
      }

    case "thumbnail":

      if (imageWidth > 180 || imageHeight > 180) {
        return "Thumbnail image should be 180px x 180px or less ";
      } else if (ratio > 1.5 || ratio < 0.67) { //thumbnail = 3/2 or 2/3 ratio
        return "Thumbnail aspect ratio should be 3:2 or 2:3. " + ratio;
      } else {
        return ""
      }

    default:
      return "Image file name invalid for pass type";
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onImageRectClick() {

    currentEditTarget = d3.select(this).attr("data-target");

    d3.selectAll("rect").attr("class", "img-btn-rect");
    d3.select(this).attr("class", "img-btn-rect select");

    //update the legend in popover to display the id of the field
    d3.select("form#pop-image legend")
      .text(currentEditTarget + ".png Image");

    d3.select("#pop-image-input")
      .attr('disabled', null);

    d3.select("button#image-pop-btn")
      .on("click", null)
      .attr('disabled', null)
      .on("click", onImageUpload);

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onImageUpload() {

    console.log("onUpload");
    d3.event.preventDefault();

    if (checkImage()) {

      //get file object
      var file = $('#pop-image-input')[0].files[0];


      var img;
      var wURL = window.URL || window.webkitURL;
      img = new Image();
      var ratio = 0;
      img.onload = function () {

        var errorMessage = checkImageSize(currentEditTarget, this.width, this.height);

        if (errorMessage != "") {

          pb.alertDisplay("error", errorMessage);

        } else { //--------------success

          // create reader
          var reader = new FileReader();
          reader.readAsDataURL(file); //data encoded url

          reader.onload = function (e) {

            var isReplace = false;
            for (var i = 0; i < pb.template().images.length; i++) {
              if (pb.template().images[i].name == currentEditTarget) {

                pb.template().images[i].image = e.target.result;
                isReplace = true;
              }
            }

            //if the image is not found, add a new image to the array
            if (!isReplace) {

              var imageData = {
                image: e.target.result,
                name: currentEditTarget
              };

              pb.template().images.push(imageData);
            }

            setPassImages();
            //postUpdate(passData);

          };
        }



      };

      img.src = wURL.createObjectURL(file);

    }

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////
  pb.image = {
    /* set pass images */
    set: function () {
      setPassImages();
    },

    onRectClick: function () {
      onImageRectClick();
    },

    onUpload: function () {
      onImageUpload();
    }
  };
  //return passImages; //return the image object

}(passBuilder = window.passBuilder || {}, jQuery));
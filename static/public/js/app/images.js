(function(app, tk, pb, $, undefined) {

  'use strict';

  var currentEditTarget; //id of image currently selected

  /***********************************************************


  ***********************************************************/
  function init() {

    //add handler for delete image button
    d3.select('button#btn-del-image')
      .call(tk.disable) //starts disabled
      .on('click', onDelImage);

    pb.svg().selectAll('rect.img-btn-rect')
    .on('click', onImageRectClick); //add event to rect

  }

  /***********************************************************
  onDelImage deletes the image from the svg and the pass data
  images array.

  ***********************************************************/
  function onDelImage() {
    d3.event.preventDefault();

    var imageSelect = pb.svg().select('#' + currentEditTarget);
    console.log(currentEditTarget);
    if (!imageSelect.empty()) { //remove it if its in the svg
      console.log(imageSelect);
      imageSelect.remove(); //remove from svg

      var matchIndex = pb.template().images.map(function(e) {
        return e.name;
      }).indexOf(currentEditTarget); //find the index of the matching image name
      pb.template().images.splice(matchIndex, 1); //remove the image from the array
    }

  }

  /***********************************************************


 	***********************************************************/
  function checkImage() {

    //check whether browser fully supports all File API
    if (window.File && window.FileReader && window.FileList && window.Blob) {

      if (!$('#image-input').val()) //check empty input field
      {
        tk.alertDisplay('error', 'no image selected');
        return false
      }

      var file = $('#image-input')[0].files[0]; //get file
      var fsize = file.size; //get file size
      var ftype = file.type; // get file type


      //Allowed file size is less than 1 MB (1048576)
      if (fsize > 1048576) {

        tk.alertDisplay('error', 'Image file should be less than 1MB!');
        return false
      }

      return true; //success

    } else {

      //Output error to older unsupported browsers that doesn't support HTML5 File API
      tk.alertDisplay('error', 'Please upgrade your browser!');
      return false;
    }
  }

  /***********************************************************


 	***********************************************************/
  function checkImageSize(imageName, imageWidth, imageHeight) {

    var ratio = imageWidth / imageHeight;

    switch (imageName) {
      case 'logo':

        if (imageWidth > 320 || imageHeight > 100) {
          return 'Logo image should be 320px x 100px or less ';
        } else {
          return ''
        }

      case 'icon':

        if (imageWidth > 152 || imageHeight > 152) {
          return 'Icon image should be 152px x 152px or less ';
        } else {
          return ''
        }

      case 'strip': //TODO: the are some variations based on passtype

        if (imageWidth > 640 || imageHeight > 246) {
          return 'Strip image should be 640 x 246 or less ';
        } else {
          return ''
        }

      case 'background':

        if (imageWidth > 360 || imageHeight > 440) {
          return 'Background image should be 360px x 440px or less ';
        } else {
          return ''
        }

      case 'footer':

        if (imageWidth > 572 || imageHeight > 30) {
          return 'Footer image should be 572px x 30px or less ';
        } else {
          return ''
        }

      case 'thumbnail':

        if (imageWidth > 180 || imageHeight > 180) {
          return 'Thumbnail image should be 180px x 180px or less ';
        } else if (ratio > 1.5 || ratio < 0.67) { //thumbnail = 3/2 or 2/3 ratio
          return 'Thumbnail aspect ratio should be 3:2 or 2:3. ' + ratio;
        } else {
          return ''
        }

      default:
        return 'Image file name invalid for pass type';
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onImageRectClick() {

    currentEditTarget = d3.select(this).attr('data-target');

    //add and remove select styling
    pb.svg().selectAll('rect').attr('class', 'img-btn-rect');
    d3.select(this).attr('class', 'img-btn-rect select');

    //update the legend in popover to display the id of the field
    d3.select('form#image-upload legend')
      .text(currentEditTarget + '.png Image');

    //enable image input
    d3.select('#image-input')
      .call(tk.enable);

    //enable image add button
    d3.select('button#image-upload-btn')
      .on('click', null)
      .call(tk.enable)
      .on('click', onImageUpload);

    //enable delete image button
    d3.select('button#btn-del-image')
      .call(tk.enable);

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onImageUpload() {

    console.log('onUpload');
    d3.event.preventDefault();

    if (checkImage()) {

      //get file object
      var file = $('#image-input')[0].files[0];


      var img;
      var wURL = window.URL || window.webkitURL;
      img = new Image();
      var ratio = 0;
      img.onload = function() {

        var errorMessage = checkImageSize(currentEditTarget, this.width, this.height);

        if (errorMessage != '') {

          tk.alertDisplay('error', errorMessage);

        } else { //--------------success

          // create reader
          var reader = new FileReader();
          reader.readAsDataURL(file); //data encoded url

          reader.onload = function(e) {

            setImageData(currentEditTarget,e.target.result); //set uploaded image as selected image type

            if (currentEditTarget == "logo"){ //FIXME: This is temporary should change
              setImageData("icon",e.target.result); //set uploaded logo image as icon
            }

            app.passBuilder.image.set(); //update the pass svg

          };
        }

      };

      img.src = wURL.createObjectURL(file);

    }

  }

  /***********************************************************


  ***********************************************************/
  function setImageData(imageName,imageData) {

    if (!replaceImage(imageName, imageData)) {

      var imageObj = {
        image: imageData,
        name:imageName
      };

      pb.template().images.push(imageObj); //add image to image array
    }
  }

  /***********************************************************


  ***********************************************************/
  function replaceImage(imageName, imageData) {

    var imageList = pb.template().images;
    var imageLen = imageList.length;
    for (var i = 0; i < imageLen; i++) {
      if (imageList[i].name == imageName) {
        imageList[i].image = imageData;
        return true;
      }
    }

    return false;

  }

  /***********************************************************


  ***********************************************************/
  function onImageSave(index) {

    console.log(pb.template().images);

    if (pb.template().images) {

      var passData = {
        'name': pb.template().name,
        'status': pb.status(pb.image.index()),
        'images': pb.template().images
      };
      pb.update(pb.template().id, passData);
    }

  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////
  pb.image = {
    init: function() {
      init();
    },
    onRectClick: function() {
      onImageRectClick();
    },
    onUpload: function() {
      onImageUpload();
    },
    save: function() {
      onImageSave();
    },
    name: function() {
      return 'images';
    },
    index: function() {
      return 6;
    }

  };

}(window.passNinja, passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));

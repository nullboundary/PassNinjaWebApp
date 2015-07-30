  (function (tk, pb, undefined) {

    'use strict';

    /***********************************************************


    ***********************************************************/
    function setPassImages() {

      //- if image is not in the pb.template() data

      //- remove image from the svg template
      //- leave the group rectangle

      //- if image does exist in pb.template() data
      //- replace or add image to svg template

      if (pb.template().images) {

        var imageTypes = ['logo', 'icon', 'strip', 'background', 'footer', 'thumbnail'];

        //diff contains what was in imageTypes[] that is not in pb.template().images[]
        var diff = imageTypes.filter(function (imgType) {
          if (pb.template().images.map(function (e) {
              return e.name;
            }).indexOf(imgType) === -1) {
            return imgType;
          }
        });

        //diff contains what was in imageTypes[] that is not in pb.template().images[]
        //var diff = $(imageTypes).not(pb.template().images).get();

        //remove all images from svg if they are part of the pass data
        for (var i = 0; i < diff.length; ++i) {
          var imageSelection = pb.svg().select('g.img-btn-group #' + diff[i]);
          if (!imageSelection.empty()) { //remove it if its in the svg
            imageSelection.remove();
          }
        }

        if (pb.template().images != null) {
          //add or replace images that exist in data
          var imageLength = pb.template().images.length;
          for (var index = 0; index < imageLength; ++index) {

            var imageObj = pb.template().images[index];

            //select the image id. Example: g.img-btn-group #logo
            var imageSelection = pb.svg().select('g.img-btn-group #' + imageObj.name);

            if (imageSelection.empty()) { //if group has no image, add image. svg images were removed above!

              //select th imageGroup specific to that image. Example: g.img-btn-group#logo-group
              var imageGroup = pb.svg().select('g.img-btn-group#' + imageObj.name + '-group')

              if (!imageGroup.empty()) { //image group exists
                var imageRect = imageGroup.select('rect.img-btn-rect'),
                  rectWidth = imageRect.attr('width'),
                  rectHeight = imageRect.attr('height'),
                  rectX = imageRect.attr('x'),
                  rectY = imageRect.attr('y');

                imageGroup
                  .insert('image', 'rect.img-btn-rect') //insert before the rect
                  .attr('id', imageObj.name)
                  .attr('xlink:href', imageObj.image)
                  .attr('width', rectWidth)
                  .attr('height', rectHeight)
                  .attr('x', rectX)
                  .attr('y', rectY);

              } else {
                //TODO: some cases group doesn't exist! (eg thumbnail)
              }

            } else { //replace image

              //add rect click event to empty image group.
              imageSelection.attr('xlink:href', imageObj.image);
            }


          }
        }
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
      name: function () {
        return 'images';
      }
    };

  }(passNinja.toolkit, this.passBuilder = passNinja.passBuilder || {}));

(function (pb, $, undefined) {

  'use strict';

  function init() {

    //set the input box handler for the label
    //  d3.select("#back-label")
    //    .on("input", onLabelSubmit);

    //set the input box handler for the value
    //  d3.select("#back-text")
    //    .on("input", onTextSubmit);

    //add handler for delete field button
    d3.select("button#btn-del-back-field")
      .on("click", onDelField);

    //add handler for add field button
    d3.select("button#btn-add-back-field")
      .on("click", onAddField);


  }


  /***********************************************************


   ***********************************************************/
  function addHandlers() {

      var backBBox = d3.select("g#back-fields").node().getBBox(); //calculated BBox of back fields group
      //console.log(backBBox);
      var backSVG = d3.select("svg.back");
      var svgWidth = parseFloat(backSVG.attr('width'));
      var svgHeight = parseFloat(backSVG.attr('height'));

      var zoom = d3.behavior.zoom()
        .scaleExtent([1, 10])
        .on("zoom", function () {

          //move back-fields group
          d3.select("g#back-fields").attr("transform", "translate(0," + d3.event.translate[1] + ")");

          backBBox = d3.select("g#back-fields").node().getBBox();
          var topYLoc = zoom.translate()[1]; //get the Y translate of pan (mouse/touch loc)
          var bottomYLoc = topYLoc + backBBox.height; //the bottom edge of the back-fields group
          var scale = svgHeight / backBBox.height;
          var length = svgHeight * scale; //length of scroll bar

          updateScrollBar(topYLoc, backBBox.height);

          if (topYLoc > -10) { //limit pull down.

            //create linear scale range to adjust scrollbar length
            var lineScale = d3.scale.linear()
              .domain([80, -10]) //input
              .range([15, length]) //minium length to maximum length of scrollbar.
              .clamp(true);

            limitScroll(lineScale, topYLoc, 10, length, svgHeight);

          } else if ((bottomYLoc) < (svgHeight - 40)) { //limit pull up

            var lineScale = d3.scale.linear()
              .domain([(backBBox.height - 80), (backBBox.height - 10)])
              .range([svgHeight - 15, svgHeight - length]) //minium length to maximum length of scrollbar.
              .clamp(true);

            limitScroll(lineScale, bottomYLoc, svgHeight - 10, length, svgHeight);

          }

          if (d3.event.sourceEvent != null) {
            d3.event.sourceEvent.stopPropagation(); //don't let onepage scroll to the next page.
          }


        })
        .on('zoomstart', function () {

          backBBox = d3.select("g#back-fields").node().getBBox();
          var topYLoc = zoom.translate()[1];
          updateScrollBar(topYLoc, backBBox.height);

        })
        .on('zoomend', function () {

          backBBox = d3.select("g#back-fields").node().getBBox();
          var topYLoc = zoom.translate()[1];
          var bottomYLoc = topYLoc + backBBox.height; //the bottom edge of the back-fields group
          console.log(" bbOx:" + backBBox.height);

          if (topYLoc > 0) { //return to zero after pull down.

            zoom.translate([0, 0]);
            d3.select("g#back-fields").transition().ease("cubic").attr("transform", "translate(0," + 0 + ")");

          } else if (bottomYLoc < (svgHeight - 30)) { //return to zero after pull up.
            var defaultY = (svgHeight - 60) - backBBox.height;
            zoom.translate([0, defaultY]);
            d3.select("g#back-fields").transition().ease("cubic").attr("transform", "translate(0," + defaultY +
              ")");
          }


          updateScrollBar(topYLoc, backBBox.height);

          //hide srollbar
          d3.select("line#scroll-bar")
            .transition()
            .delay(1000)
            .style('display', 'none')


        });

      //activate zoom/pan events
      d3.select("svg.back")
        .call(zoom)
        .call(zoom.event);


    }
    /***********************************************************


     ***********************************************************/
  function limitScroll(lineScale, yLoc, yExtent, barLength, passHeight) {

    if (barLength < passHeight) {

      //console.log("yLoc:" + yLoc + " lineStart:" + lineScale(yLoc) + " length:" + barLength);

      var y1 = lineScale(yLoc);
      var y2 = yExtent;

      if (y1 < y2) {
        drawScrollBar(y1, y2);
      } else {
        drawScrollBar(y2, y1);
      }

    }
  }


  /***********************************************************


   ***********************************************************/
  function updateScrollBar(yLoc, gHeight) {

      var scale = 401 / gHeight; //TODO: == svgHeight

      if (scale < 1) {

        var length = 401 * scale; //length of scroll bar

        var lineStart = d3.scale.linear()
          .domain([-gHeight, 0])
          .range([401, 0])
          .clamp(true);

        //  console.log("yLoc:" + yLoc + " lineStart:" + lineStart(yLoc) + " length:" + length);

        var y1 = lineStart(yLoc);
        var y2 = y1 + length;

        drawScrollBar(y1, y2);
      }

    }
    /***********************************************************


     ***********************************************************/
  function drawScrollBar(y1, y2) {
    d3.select("line#scroll-bar")
      .style('display', 'inline')
      .transition().delay(0).duration(55)
      .attr("x1", 310)
      .attr("y1", y1)
      .attr("x2", 310)
      .attr("y2", y2)
      .attr("stroke", "rgb(148,148,148)")
      .attr("stroke-linecap", "round")
      .attr("stroke-width", 4);

  }

  /***********************************************************


   ***********************************************************/
  function addText(backFields) {

    var margin = 16;

    //add the label
    backFields.append("text")
      .attr("x", 0)
      .attr("y", 15)
      .attr("class", "back-label")
      .attr("dy", ".71em")
      .text(function (d) {
        return d.label;
      });

    //add the value text
    backFields.append("text")
      .attr("x", 0)
      .attr("y", 20)
      .attr("dy", "1.81em") //Start 1 line down from label
      .attr("class", "back-text")
      .text(function (d) {

        return d.value;
      })
      .call(wrap, (315 - (margin * 3))); //then wrap text


    /*
        var label = field.label;
        var value = field.value;

        var backBBox = d3.select("g#back-fields").node().getBBox();
        var marginRight = 16;
        var fieldWidth = backBBox.width - (marginRight * 3);


        //add label text
        groupElm.append("text")
          .attr("x", 0)
          .attr("y", 15)
          .attr("class", "back-label")
          .attr("dy", ".71em")
          .text(label);

        //add text elm to pass
        groupElm.append("text")
          .attr("x", 0)
          .attr("y", 20)
          .attr("dy", "1.81em") //Start 1 line down from label
          .attr("class", "back-text")
          .text(value) //add text to element first
          .call(wrap, fieldWidth); //then wrap text

        return groupElm.node().getBBox();
    */


  }

  /***********************************************************


   ***********************************************************/
  function wrap(text, width) {

    text.each(function () {
      var textElm = d3.select(this),
        words = textElm.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = textElm.attr("y"),
        dy = parseFloat(textElm.attr("dy")),
        tspan = textElm.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");

      while (word = words.pop()) {

        line.push(word);
        tspan.text(line.join(" "));

        if (tspan.node().getComputedTextLength() > width) {

          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textElm.append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", ++lineNumber * lineHeight + dy + "em")
            .text(word);

        }
      }
    });

  }

  /***********************************************************


   ***********************************************************/
  function onSelectBackField() {
    console.log(this);

    var group = d3.select(this.parentNode);
    var backFields = pb.template().keyDoc[pb.passType()].backFields;
    var index = parseInt(group.attr('id').slice(-1)); //get keydoc index

    //remove selected class styling from all rect
    d3.selectAll('.back-field').each(function (d, i) {
      d3.select(this).attr('class', 'back-field');
    });

    //set selected class styling on this rect
    d3.select(this).attr('class', 'back-field select');

    //get label and value from keydoc
    var labelText = backFields[index].label;
    var valueText = backFields[index].value;

    //set input to label
    d3.select("input#back-label")
      .attr('value', labelText);

    //set textarea to value
    d3.select("textarea#back-text")
      .text(valueText);

  }

  /***********************************************************


   ***********************************************************/

  function onDelField() {
    d3.event.preventDefault();
  }

  /***********************************************************


   ***********************************************************/
  function onAddField() {

    d3.event.preventDefault();

    var label = $("input#back-label").val();
    var val = $.trim($("textarea#back-text").val());

    if (val != "") {

      var backFields = pb.template().keyDoc[pb.passType()].backFields;
      var keyValue = "backField" + backFields.length;

      var fieldData = {
        "key": keyValue,
        "label": label,
        "value": val
      };

      backFields.splice(backFields.length, 0, fieldData);

      setBackFields2();

    }

  }

  /***********************************************************


   ***********************************************************/
  function setBackFields2() {

    var backDataSet = pb.template().keyDoc[pb.passType()].backFields;
    var backFieldRect = d3.select('rect#back-fields-bg');
    var margin = 16;

    //reset backfield rect length
    backFieldRect.attr('height', 0);
    //remove groups that already exist
    var groupElems = d3.selectAll("g.back-field");
    groupElems.each(function () {
      d3.select(this).remove();
    });

    if (typeof backDataSet !== "undefined") {

      var backGroup = d3.select("g#back-fields");

      //bind dataset
      var backFields = backGroup.selectAll(".back-field").data(backDataSet);

      //create the back field groups from the dataset
      backFields.enter().append('g')
        .attr("class", "back-field")
        .attr('id', function (d, i) {
          return "back" + i;
        });

      addText(backFields);

      //add the line between groups
      backFields.append('line')
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", 315)
        .attr("y2", 0)
        .attr("class", "delimiter");

      //set the group translation
      backFields.attr("transform", function (d, i) {
        var backBBox = d3.select("g#back-fields").node().getBBox(); //calculated BBox of back fields group
        var marginBottom = 20;
        if (i == 0) {
          marginBottom = 0;
        }
        var groupY = backBBox.height + marginBottom;
        return "translate(" + margin + "," + groupY + ")";
      });

      //extend the back fields rectangle
      var backBBox = d3.select("g#back-fields").node().getBBox(); //calculated BBox of back fields group
      var textHeight = backBBox.height - parseInt(backFieldRect.attr('y'));

      var rectHeight = parseInt(backFieldRect.attr('height'));
      rectHeight = rectHeight + textHeight + 25;
      console.log("rectHeight:" + rectHeight + " bbOx:" + textHeight);
      backFieldRect.attr('height', rectHeight + 25);



    }
  }



  /***********************************************************


   ***********************************************************/
  function setBackFields() {

    var backFields = pb.template().keyDoc[pb.passType()].backFields;
    var backFieldRect = d3.select('rect#back-fields-bg');

    //reset backfield rect length
    backFieldRect.attr('height', 0);
    //remove groups that already exist
    var groupElems = d3.selectAll("g.back-field");
    groupElems.each(function () {
      d3.select(this).remove();
    });

    if (typeof backFields !== "undefined") {

      for (var index = 0; index < backFields.length; index++) {

        var backBBox = d3.select("g#back-fields").node().getBBox(); //calculated BBox of back fields group
        var margin = 16;
        var groupY = backBBox.height + 25;


        //add field group
        var backGroup = d3.select("g#back-fields")
          .append("g")
          .attr("class", "back-field")
          .attr('id', 'back' + index)
          .attr("transform", "translate(" + margin + "," + groupY + ")")

        if (index > 0) { //delimiter line for all groups but first one

          backGroup.append('line')
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 315)
            .attr("y2", 0)
            .attr("class", "delimiter");
        }

        var textBBox = addText(backGroup, backFields[index]); //add label and value text

        var bGroupBBox = backGroup.node().getBBox();
        backGroup.append('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 285)
          .attr('height', bGroupBBox.height)
          .on("click", onSelectBackField);

        //extend the back fields rectangle
        var rectHeight = parseInt(backFieldRect.attr('height'));
        rectHeight = rectHeight + textBBox.height + 25;
        console.log("rectHeight:" + rectHeight + " bbOx:" + backBBox.height);
        backFieldRect.attr('height', rectHeight);

      }
    }

  }



  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.backFields = {
    /* setup and configure backFields handlers */
    addHandlers: function () {
      addHandlers();
    },

    init: function () {
      init();
    },

    save: function () {

    },

    set: function () {
      setBackFields2();
    }

  };

}(passBuilder = window.passBuilder || {}, jQuery));

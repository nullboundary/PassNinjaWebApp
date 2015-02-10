(function(tk, pb, $, undefined) {

  'use strict';

  var editGroup = {
    'groupId': '', //svg id of group
    'index': '' //keydoc array index value
  };

  var backSVG;
  var svgWidth;
  var svgHeight;

  /***********************************************************


	***********************************************************/
  function init() {

    backSVG = d3.select('svg#passBack');
    svgWidth = parseFloat(backSVG.attr('width'));
    svgHeight = parseFloat(backSVG.attr('height'));

    //add handler for delete field button
    d3.select('button#btn-del-back-field')
      .on('click', onDelField);

    //add handler for add field button
    d3.select('button#btn-add-back-field')
      .on('click', onAddField);

    //add handler for update field button
    d3.select('button#btn-update-back-field')
      .on('click', onUpdateField);

    //add a newline for enter key in textarea.
    d3.select('textarea#back-text')
      .on('keypress', function() {
        if (d3.event.keyCode == 13) {
          this.value += '\r\n';
        }
      });

  }


  /***********************************************************


	 ***********************************************************/
  function addHandlers() {

      //setup scrolling for the backfields
      var zoom = d3.behavior.zoom()
        .scaleExtent([1, 10])
        .on('zoom', onScroll) //scroll move behavior
        .on('zoomstart', function() {

          var backBBox = d3.select('g#back-fields').node().getBBox();
          var topYLoc = zoom.translate()[1];
          updateScrollBar(topYLoc, backBBox.height);

        })
        .on('zoomend', function() {
          onScrollEnd(zoom)
        });

      //activate zoom/pan events
      d3.select('svg.back')
        .call(zoom)
        .call(zoom.event);

    }
    /***********************************************************


		 ***********************************************************/
  function limitScroll(lineScale, yLoc, yExtent, barLength, passHeight) {

    if (barLength < passHeight) {

      console.log('limit: yLoc:' + yLoc + ' lineStart:' + lineScale(yLoc) + ' length:' + barLength);

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

      var scale = svgHeight / gHeight;

      if (scale < 1) {

        var length = svgHeight * scale; //length of scroll bar

        var lineStart = d3.scale.linear()
          .domain([-gHeight, 0]) // example: -600 to 0
          .range([svgHeight, 10]) // exmaple: 401 to 10
          .clamp(true);

        console.log('update: yLoc:' + yLoc + ' lineStart:' + lineStart(yLoc) + ' length:' + length);

        var y1 = lineStart(yLoc);

        //set the upper and lower bounds to the bar length.
        var lineEnd = d3.scale.linear()
          .domain([0, 1]) //input
          .range([10, svgHeight - 10]) //minium y2 to maximum y2 scrollbar.
          .clamp(true);

        var y2 = y1 + lineEnd(scale);
        if (y2 > svgHeight - 10) { //messy but limits overflow of pass edge.
          y2 = svgHeight - 10;
        }

        drawScrollBar(y1, y2);
      }

    }
    /***********************************************************


		 ***********************************************************/
  function drawScrollBar(y1, y2) {
    console.log("y1:" + y1 + " y2:" + y2);
    d3.select('line#scroll-bar')
      .style('display', 'inline')
      .transition().delay(0).duration(55)
      .attr('x1', 310)
      .attr('y1', y1)
      .attr('x2', 310)
      .attr('y2', y2)
      .attr('stroke', 'rgb(148,148,148)')
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', 4);

  }

  /***********************************************************


	***********************************************************/
  function onScroll() {

      var scrollPassMargin = 10; //distance from pass edge to start of scrollbar
      var scrollMinLength = 15; //the smallest length for a scrollbar
      //move back-fields group to mouse position
      d3.select('g#back-fields').attr('transform', 'translate(0,' + d3.event.translate[1] + ')');
      var backBBox = d3.select('g#back-fields').node().getBBox();
      var topYLoc = d3.event.translate[1]; //get the Y translate of pan (mouse/touch loc)

      var bottomYLoc = topYLoc + backBBox.height; //the bottom edge of the back-fields group
      var scale = svgHeight / backBBox.height;
      var length = svgHeight * scale; //length of scroll bar

      if (topYLoc > -30) { //limit pull down.

        //create linear scale range to adjust scrollbar length
        var lineScale = d3.scale.linear()
          .domain([80, -scrollPassMargin]) //input
          .range([scrollMinLength, length]) //minium length to maximum length of scrollbar.
          .clamp(true);

        limitScroll(lineScale, topYLoc, scrollPassMargin, length, svgHeight);

      } else if ((bottomYLoc) < (svgHeight - 40)) { //limit pull up

        var lineScale = d3.scale.linear()
          .domain([(svgHeight - 80), (svgHeight - scrollPassMargin)])
          .range([svgHeight - scrollMinLength, svgHeight - length]) //minium length to maximum length of scrollbar.
          .clamp(true);

        limitScroll(lineScale, bottomYLoc, svgHeight - scrollPassMargin, length, svgHeight);

      } else {
        updateScrollBar(topYLoc, backBBox.height);
      }

      if (d3.event.sourceEvent != null) {
        d3.event.sourceEvent.stopPropagation(); //don't let onepage scroll to the next page.
      }

    }
    /***********************************************************


		***********************************************************/
  function onScrollEnd(zoom) {

    var backBBox = d3.select('g#back-fields').node().getBBox();
    var topYLoc = zoom.translate()[1];
    var bottomYLoc = topYLoc + backBBox.height; //the bottom edge of the back-fields group

    if (topYLoc > 0) { //return to zero after pull down.
      updateScrollBar(topYLoc, backBBox.height);

      zoom.translate([0, 0]);
      d3.select('g#back-fields').transition().ease('cubic').attr('transform', 'translate(0,' + 0 + ')');

    } else if (bottomYLoc < (svgHeight - 30)) { //return to zero after pull up.

      //set bottom of backbox to svgHeight only if its longer then svgHeight.
      if (backBBox.height > svgHeight) {
        var defaultY = (svgHeight - 60) - backBBox.height;
        zoom.translate([0, defaultY]);
        d3.select('g#back-fields').transition().ease('cubic').attr('transform', 'translate(0,' + defaultY + ')');
        updateScrollBar(defaultY, backBBox.height);

      } else {
        zoom.translate([0, 0]);
        d3.select('g#back-fields').transition().ease('cubic').attr('transform', 'translate(0,' + 0 + ')');
      }
    }

    //hide scrollbar
    d3.select('line#scroll-bar')
      .transition()
      .delay(1000)
      .style('display', 'none')

  }

  /***********************************************************


	 ***********************************************************/
  function addText(backFields) {

    var margin = 16;

    //add the label
    backFields.append('text')
      .attr('x', 0)
      .attr('y', 15)
      .attr('class', 'back-label')
      .attr('dy', '.71em')
      .text(function(d) {
        return d.label;
      });

    //add the value text
    backFields.append('text')
      .attr('x', 0)
      .attr('y', 20)
      .attr('dy', '1.81em') //Start 1 line down from label
      .attr('class', 'back-text')
      .text(function(d) {
        console.log(d.value);
        return d.value;
      })
      .call(wrap, (315 - (margin * 3))); //then wrap text

  }

  /***********************************************************


	 ***********************************************************/
  function wrap(text, width) {

    text.each(function() {
      var textElm = d3.select(this),
        result = textElm.text().replace(/\r\n/g, " &#10;").replace(/\n/g, " &#10;"), //convert \n to &#10; for easier matching below.
        words = result.split(/[\s+]/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 1.1, // ems
        y = textElm.attr('y'),
        dy = parseFloat(textElm.attr('dy')),
        tspan = textElm.text(null).append('tspan').attr('x', 0).attr('y', y).attr('dy', dy + 'em');

      while (word = words.pop()) {
        var match = /&#10;/.test(word); //detect newline char &#10;
        if (match) word = word.replace(/&#10;/g, ""); //remove it &#10;
        line.push(word);
        tspan.text(line.join(' '));
        //if line length is wider then passWidth or if newline char. Set a new line.
        if (tspan.node().getComputedTextLength() > width || match) {

          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = textElm.append('tspan')
            .attr('x', 0)
            .attr('y', y)
            .attr('dy', ++lineNumber * lineHeight + dy + 'em')
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

    //remove selected class styling from previous selected rect
    if (editGroup.groupId != '') {
      d3.select('#' + editGroup.groupId).select('rect').attr('class', 'back-btn-rect');
    }
    //set selected class styling on this rect
    d3.select(this).attr('class', 'back-btn-rect select');

    group.each(function(d) {
      //set input to label
      d3.select('input#back-label')
        .property('value', d.label);
      //set textarea to value
      d3.select('textarea#back-text')
        .property('value', d.value);

      //update the selected edit group data
      var index = this.id.slice(4);
      editGroup = {
        'groupId': this.id, //svg id of group
        'index': index //keydoc array index value
      };

      //set legend
      d3.select('#back-legend')
        .text("Back Field " + (parseInt(index)+1));

    });

    console.log(editGroup.groupId);
  }

  /***********************************************************


	 ***********************************************************/

  function onDelField() {
    d3.event.preventDefault();
    var backFields = pb.template().keyDoc[pb.passType()].backFields;

    backFields.splice(editGroup.index, 1); //remove this field data from the keyDoc

    setBackFields2();

  }

  /***********************************************************


	 ***********************************************************/

  function onUpdateField() {
    d3.event.preventDefault();

    var label = d3.select('input#back-label').node().value;
    var val = $('textarea#back-text').val();
    console.log(val);
    var backFields = pb.template().keyDoc[pb.passType()].backFields;

    backFields[editGroup.index].label = label;
    backFields[editGroup.index].value = val;

    setBackFields2();

    d3.select(editGroup.groupId).select('rect').attr('class', 'back-btn-rect select');

  }

  /***********************************************************


	 ***********************************************************/
  function onAddField() {

    d3.event.preventDefault();

    var backFields;

    //if backfields already exists use it. else, make a new one and add it.
    if (pb.template().keyDoc[pb.passType()].hasOwnProperty('backFields')) {
      backFields = pb.template().keyDoc[pb.passType()].backFields;
    } else {
      backFields = [];
      pb.template().keyDoc[pb.passType()].backFields = backFields;
    }

    var nextIndex = backFields.length;
    var groupId = 'back' + nextIndex;
    var keyValue = groupId + "-" + tk.gUID();

    var fieldData = {
      'key': keyValue,
      'label': 'Label',
      'value': 'Value'
    };

    backFields.splice(nextIndex, 0, fieldData);

    //update the selected edit group data
    editGroup = {
      'groupId': groupId, //svg id of group
      'index': nextIndex //keydoc array index value
    };

    setBackFields2();

    //select and highlight the new rect.
    d3.select('#'+editGroup.groupId).select('rect').each(onSelectBackField);

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
    var groupElems = d3.selectAll('g.back-field');
    groupElems.each(function() {
      d3.select(this).remove();
    });

    if (typeof backDataSet !== 'undefined') {

      var backGroup = d3.select('g#back-fields');
      //bind dataset
      var backFields = backGroup.selectAll('.back-field').data(backDataSet);

      //create the back field groups from the dataset
      backFields.enter().append('g')
        .attr('class', 'back-field')
        .attr('id', function(d, i) {
          return 'back' + i;
        });

      addText(backFields);

      //add the line between groups
      backFields.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 315)
        .attr('y2', 0)
        .attr('class', 'delimiter')
        .style('visibility', function(d, i) {
          if (i == 0) {
            return 'hidden';
          }
        });

      //var bGroupBBox = backGroup.node().getBBox();
      backFields.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 285)
        .attr('height', function(d, i) {
          var bGroupBBox = d3.select(this.parentNode).node().getBBox();
          return bGroupBBox.height
        })
        .attr('class', function(d) {

          if (editGroup.groupId == d3.select(this.parentNode).attr('id')) {
            return 'back-btn-rect select';
          }
          return 'back-btn-rect';

        })
        .on('click', onSelectBackField);

      //set the group translation
      backFields.attr('transform', function(d, i) {
        var backBBox = d3.select('g#back-fields').node().getBBox(); //calculated BBox of back fields group
        var marginBottom = 20;
        if (i == 0) {
          marginBottom = 0;
        }
        var groupY = backBBox.height + marginBottom;
        return 'translate(' + margin + ',' + groupY + ')';
      });

      //extend the back fields rectangle
      var backBBox = d3.select('g#back-fields').node().getBBox(); //calculated BBox of back fields group
      var textHeight = backBBox.height - parseInt(backFieldRect.attr('y'));
      var rectHeight = parseInt(backFieldRect.attr('height'));
      rectHeight = rectHeight + textHeight + 25;
      console.log('rectHeight:' + rectHeight + ' bbOx:' + textHeight);
      backFieldRect.attr('height', rectHeight + 25);

    }
  }

  /***********************************************************


	***********************************************************/
  function onBackFieldsSave() {

    console.log(pb.template().keyDoc[pb.passType()].backFields);

    var passKey = pb.template().keyDoc[pb.passType()];

    if (passKey.backFields) {

      var passData = {
        'name': pb.template().name,
        'status': pb.status(pb.backFields.index()),
        'keyDoc': {}
      };

      passData.keyDoc[pb.passType()] = {
        'backFields': passKey.backFields
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

  pb.backFields = {
    /* setup and configure backFields handlers */
    addHandlers: function() {
      addHandlers();
    },

    init: function() {
      init();
    },

    save: function() {
      onBackFieldsSave();
    },

    set: function() {
      setBackFields2();
    },

    xray: function() {
      pb.location.xray(false);
    },

    name: function() {
      return 'backInfo';
    },

    index: function() {
      return 9;
    }


  };

}(passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));

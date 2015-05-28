  (function (tk, pb, undefined) {

    'use strict';

    var fieldMargin = 15; //the space between pass fields = 7.5
    var passWidth = 315 - 15;
    var passEdgeMargin = 6; //the space between a field and the edge of the pass

    var pkFieldType = { //convert svg field class to pass field types
      'aux': 'auxiliaryFields',
      'second': 'secondaryFields',
      'header': 'headerFields',
      'primary': 'primaryFields',
      'default': ''
    };

    var pKValueToSVG = { //convert apple PK constant to css
      'PKTextAlignmentLeft': 'start',
      'PKTextAlignmentCenter': 'middle',
      'PKTextAlignmentRight': 'end',
      'PKTextAlignmentNatural': 'inherit',
      'default': 'inherit'
    };

    var pKNumberToJs = { //convert apple PK constant to js number format

      'None': function () {
        return d3.format('');
      },
      'PKNumberStyleDecimal': function () {
        return d3.format('.4r'); //13.00
      },
      'PKNumberStylePercent': function () {
        return d3.format('%'); //multiply by 100 and suffix with '%'
      },
      'PKNumberStyleScientific': function () {
        return d3.format('.3n'); //1.33e+5
      },
      'PKNumberStyleSpellOut': function () {
        return; //TODO: implement spell out function
      }
    };

    var pKDateTojsDate = { //convert apple PK constant to js date

      'PKDateStyleNone': function () {
        return d3.time.format('');
      },
      'PKDateStyleShort': function () {
        return d3.time.format('%_m/%e/%y');
      },
      'PKDateStyleMedium': function () {
        return d3.time.format('%b %e, %Y');
      },
      'PKDateStyleLong': function () {
        return d3.time.format('%B %e, %Y');
      },
      'PKDateStyleFull': function () {
        return d3.time.format('%A, %B %e, %Y AD');
      }
    };

    var pKTimeTojsTime = { //convert apple PK constant to js time

      'PKDateStyleNone': function () {
        return d3.time.format.iso;
      },
      'PKDateStyleShort': function () {
        return d3.time.format('%_I:%M %p');
      },
      'PKDateStyleMedium': function () {
        return d3.time.format('%_I:%M:%S %p');
      },
      'PKDateStyleLong': function () {
        return d3.time.format('%_I:%M:%S %p %Z'); //TODO - Implement time zones as text
      },
      'PKDateStyleFull': function () {
        return d3.time.format('%_I:%M:%S %p %Z');
      }
    };



    /*

  var selectToPKNumber = { //convert select options to apple PK constant
  'None': 'None',
  'Decimal': 'PKNumberStyleDecimal',
  'Percent': 'PKNumberStylePercent',
  'Scientific': 'PKNumberStyleScientific',
  'Spell Out': 'PKNumberStyleSpellOut'
};

  */

    /***********************************************************
    setPassFields add text elements and set values and labels
    for each field.

    ***********************************************************/
    function setPassFields(fieldArray, fieldType) {

      if (typeof fieldArray !== 'undefined') {
        var passGroup = pb.svg().select('g.pass-group');
        console.log("svg " + pb.svg() + " " + passGroup);
        var removeGroups = passGroup.selectAll('.' + fieldType);
        var groupLoc = removeGroups.attr('transform'); //get the translate of the first field group

        removeGroups.remove();

        //select the textGroups (that dont yet exist) and bind the data
        var textGroups = passGroup.selectAll('.' + fieldType).data(fieldArray);

        textGroups
          .enter()
          .append('g')
          .attr('transform', groupLoc) //the x gets adjusted in setFieldSizes()
          .attr('class', 'text-btn-group ' + fieldType)
          .attr('id', function (d, i) {
            var idIndex = i + 1;
            return fieldType + idIndex;
          });

        //add label & value text elems in the correct order
        var elemList = ['label', 'value']; //usually label over value
        if (fieldType == 'primary') {
          //primary fields for these types are value over label
          if (pb.passType() == 'coupon' || pb.passType() == 'storeCard') {
            elemList = ['value', 'label'];
          }
        }
        addTextElem(textGroups, fieldType, elemList);

        //set label text
        textGroups.select('.label-text')
          .text(function (d) {
            return tk.valueOrDefault(d.label);
          });


        //set value text
        textGroups.select('.value-text')
          .each(function (d, i) {
            setFormatValueField(d3.select(this), d); //set value text
          });

        pb.colors.updateText(); //set text color
        setFieldSizes(textGroups, fieldType);

        setTextElemPos(textGroups, fieldType);

        //set horizontal alignment values for text element
        textGroups.selectAll('text')
          .each(function (d, i) {
            setAlignment(d3.select(this));
          });


      }
    }


    /***********************************************************
    addTextElem takes a list of field elements and adds an empty
    label or value text element to them.

    ***********************************************************/
    function addTextElem(textGroups, fieldType, elemList) {

        var fieldPKType = pkFieldType[fieldType]; //example: auxiliaryFields

        //loop through array of label and value
        var len = elemList.length;
        for (var index = 0; index < len; ++index) {

          var textElem = textGroups
            .insert('text', d3.select(this) + 'rect.text-btn-rect') //insert the text before the rect
            .attr('id', function (d, i) {
              var idIndex = i + 1; //field id start counting at 1
              return fieldType + '-' + elemList[index] + idIndex; //example: aux-value3
            })
            .attr('dominant-baseline', 'hanging') //set text top-baseline 0,0 for most browsers
            .attr('class', function (d) {
              return elemList[index] + '-text ' + fieldPKType; //example: "value-text auxiliaryFields"
            });
        }

      }
      /***********************************************************


      ***********************************************************/
    function setTextElemPos(textGroups, fieldType) {

      var firstLineSize = 0; //font size of the first line (label or value)
      var textY = 0;

      textGroups.each(function (d, i) {

        var groupElem = d3.select(this);
        var textList = groupElem.selectAll('text');
        console.log(textList);
        //select first text child
        var firstElem = textList[0][0];
        var first = d3.select(firstElem).attr('y', 0); //set Y = 0 for first
        firstLineSize = parseFloat(first.style('font-size'));

        //select 2nd text child
        var second = textList[0][1];
        textY = firstLineSize + 5; //second element, usually value. Set the Y to be under first line.
        if (firstLineSize > 30) textY = firstLineSize - 5;
        console.log("textY:" + textY);
        d3.select(second).attr('y', textY); //set Y = first + 5 for second

        updateRectSize(groupElem, fieldType);

      });

    }

    /***********************************************************


    ***********************************************************/
    function setFieldSizes(textGroups, fieldType) {

      var minFontSize = 11;
      var totalWidth = 0,
        longestElem;


      totalWidth = getTotalWidth(textGroups, fieldType);
      //console.log("totalWidth1:" + totalWidth);
      var remainWidth = passWidth - totalWidth; //find the remaining free width on the pass

      //scale down value text font
      textGroups
        .select('text.value-text')
        .style('font-size', function (d, i) {

          var fontSize = parseFloat(d3.select(this).style('font-size')),
            multiplier = Math.min((passWidth - 17) / totalWidth, 1.0),
            newFontSize = parseFloat((fontSize * (multiplier - 0.1)));

          //console.log("newFont " + newFontSize);
          if (newFontSize <= minFontSize) {
            newFontSize = minFontSize;
          }
          return newFontSize + 'px';

        });


      totalWidth = getTotalWidth(textGroups, fieldType);
      //console.log("totalWidth2:" + totalWidth);
      var remainWidth = passWidth - totalWidth;

      //truncate text
      while (remainWidth < 0) {
        textGroups
          .each(function (d, i) {
            //console.log("height:" + this.getBBox().height);
            longestElem = findLongElem(d3.select(this), longestElem);
          });

        longestElem.call(function (d, i) {
          var fontSize = parseFloat(this.style('font-size'));
          truncateText(this);
          var parent = this.node().parentNode;
          //console.log(parent.getBBox().height);
        });

        totalWidth = getTotalWidth(textGroups, fieldType);
        //console.log("totalWidth3:" + totalWidth);
        var remainWidth = passWidth - totalWidth;
      }

    }

    /***********************************************************
    setFormatValueField sets a field value and formats the text
    to match the json data fields.

    ***********************************************************/
    function setFormatValueField(fieldElement, fieldGroup) {

      if (fieldGroup.dateStyle) {

        //format and set date if value is a date example: 2013-04-24T10:00-05:00
        var dateFormat = pKDateTojsDate[fieldGroup.dateStyle]();
        var fdate = new Date(fieldGroup.value);
        fieldElement.text(dateFormat(fdate)); //set value text as date

      } else if (fieldGroup.timeStyle) {

        //format and set date if value is a date example: 2013-04-24T10:00-05:00
        var timeFormat = pKTimeTojsTime[fieldGroup.timeStyle]();
        var fdate = new Date(fieldGroup.value);
        fieldElement.text(timeFormat(fdate)); //set value text as time

      } else if (fieldGroup.numberStyle) {

        var numberFormat = pKNumberToJs[fieldGroup.numberStyle]();
        fieldElement.text(numberFormat(Number(fieldGroup.value))); //set value text as number

      } else if (fieldGroup.currencyCode) {

        var props = {
          style: 'currency',
          currency: fieldGroup.currencyCode
        };

        var fieldNumber = Number(fieldGroup.value);
        //display output
        var currencyValue = fieldNumber.toLocaleString('en', props);
        console.log('---------->' + currencyValue);

        fieldElement.text(currencyValue); //set value text as currency


      } else {

        fieldElement.text(fieldGroup.value); //set value text as plain text
      }

    }



    /***********************************************************
    getTotalWidth calculates the total width of all the fields
    of a particular field type.

    ***********************************************************/
    function getTotalWidth(textGroups, fieldType) {

        var totalWidth = 0;

        textGroups.each(function (d, i) {
          updateRectSize(d3.select(this), fieldType); //readjust the rect in case text size changed
          totalWidth = totalWidth + (this.getBBox().width + fieldMargin); //field group width + space between
          alignFieldLeft(d3.select(this), fieldType, i);
        });

        return totalWidth;

      }
      /***********************************************************
      updateRectSize removes the old rect elem and replaces it
      with a new rect that matches the current text size.

      ***********************************************************/
    function updateRectSize(groupElem, fieldType) {

        var fieldPKType = pkFieldType[fieldType]; //example: auxiliaryFields
        groupElem.select('rect').remove();

        //add/update the rectangle around the field to match the text size
        setFieldRect(groupElem).node().setAttribute('data-target', fieldPKType);
        //setFieldRect(groupElem)
        //  .attr('data-target', fieldPKType);

      }
      /***********************************************************
      alignFieldLeft adjusts each field to align to the previous
      leftward field. Except for primary 1 which aligns right.

      ***********************************************************/
    function alignFieldLeft(groupElem, fieldType, index) {
      //adjust X loc to left side
      var groupLoc = d3.transform(groupElem.attr('transform')).translate;

      if (fieldType == 'header') { //align right for header field
        var groupWidth = groupElem.node().getBBox().width;
        var xLoc = passWidth - (groupWidth - passEdgeMargin); //10 is pass edge margin
        //groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');
        groupElem.node().setAttribute('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');

      } else if (index == 0) { //do nothing its all the way to the left already

      } else if (fieldType == 'primary' && index == 1) { //align right for 2nd primary field

        var groupWidth = groupElem.node().getBBox().width;
        var xLoc = passWidth - (groupWidth - passEdgeMargin); //10 is pass edge margin
        //groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');
        groupElem.node().setAttribute('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');

      } else { //all other fields align to previous left side field

        var prevElem = pb.svg().select('#' + fieldType + index);
        var prevLoc = d3.transform(prevElem.attr('transform')).translate;
        var prevWidth = prevElem.node().getBBox().width;
        var xLoc = prevLoc[0] + prevWidth + fieldMargin;
        //groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');
        groupElem.node().setAttribute('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');
      }
    }


    /***********************************************************
    truncateText replaces text in the svg that extends
    beyond the limit with a "..."

    ***********************************************************/
    function truncateText(longElem) {

      if (longElem) {
        console.log('longElem:' + longElem.text());
        var longText = longElem.text();
        longElem.text(longText.replace('...', '')); //remove the '...' from the end
        var valText = longElem.text();
        longElem.text(valText.slice(0, -1) + '...'); //slice off the last 2 characters add '...'

      }

    }

    /***********************************************************
    findLongElem finds the longest elem in a field group.
    Either label element or value element.

    ***********************************************************/
    function findLongElem(groupElem, longElem) {

      //find longest text subelement
      var cElem;
      var valueElem = groupElem.select('.value-text');
      var labelElem = groupElem.select('.label-text');

      if (valueElem.node().getBBox().width >= labelElem.node().getBBox().width) {
        cElem = valueElem;
      } else {
        cElem = labelElem;
      }

      //use that text element for a comparison for the row.
      if (longElem == undefined) {
        longElem = cElem;
      } else if (cElem.node().getBBox().width > longElem.node().getBBox().width) {
        longElem = cElem;
      }
      return longElem;
    }

    /***********************************************************
    getGroupLoc gets the existing text group location.

    ***********************************************************/
    function getGroupLoc(selection) {

      var groupLoc = 'translate(0,0)';

      if (!selection.empty()) {

        //get the existing group location
        groupLoc = selection.attr('transform');
        console.log(groupLoc);
      }

      return groupLoc;
    }

    /***********************************************************
    setFieldRect adds a new rect element, and sets the width,height
    and relative location.

    ***********************************************************/
    function setFieldRect(passGroup) {

      //get group bounding box size
      var rectWidth, rectHeight;
      var padding = 6;
      var groupBBox = passGroup.node().getBBox();
      var rectWidth = groupBBox.width + padding;
      var rectHeight = groupBBox.height + padding;
      var xy = -(padding / 2);

      //make rect for hovering - size of group element
      //optimized for speed
      var rectElm = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rectElm.setAttribute('class','text-btn-rect');
      rectElm.setAttribute('width',rectWidth);
      rectElm.setAttribute('height',rectHeight);
      rectElm.setAttribute('x',xy);
      rectElm.setAttribute('y',xy);
      passGroup.node().appendChild(rectElm);
      var rect = passGroup.select('rect'); //return d3 rect

      /*var rect = passGroup.append('rect')
        .attr('class', 'text-btn-rect')
        .attr('width', rectWidth)
        .attr('height', rectHeight)
        .attr('x', -(padding / 2))
        .attr('y', -(padding / 2));
      */
      //.attr('shape-rendering', 'crispEdges')

      return rect;

    }

    /***********************************************************


    ***********************************************************/
    function setAlignment(textElm) {

      var rectWidth = parseInt(d3.select(textElm.node().parentNode).select('rect').attr('width'));
      var padding = 6;
      var textPos = rectWidth - padding;

      textElm.attr('x', function (d) {
          if (d.textAlignment == 'PKTextAlignmentRight') {
            return textPos + 'px';
          } else if (d.textAlignment == 'PKTextAlignmentCenter') {
            return (textPos / 2) + 'px';
          }
          return 0;
        })
        .attr('text-anchor', function (d) { //horizontal align
          return pKValueToSVG[tk.valueOrDefault(d.textAlignment, 'default')]; //pass alignment to svg alignment.
        });


    }

    /***********************************************************


    ***********************************************************/
    function setLogo() {

      var logoGroup = pb.svg().select('g.logo');
      logoGroup.select('text.logo-text')
        .attr('dominant-baseline', 'hanging') //set text top-baseline 0,0 for most browsers
        .text(pb.template().keyDoc.logoText);

      var logoWidth = logoGroup.node().getBBox().width; // + fieldMargin; //field group width + space between
      console.log(logoWidth);

      while (logoWidth >= 180) {
        //truncateText(logoGroup.select('text.logo-text'));
        var valText = logoGroup.select('text.logo-text').text();
        logoGroup.select('text.logo-text').text(valText.slice(0, -1)); //slice off the last 2 characters add '...'
        logoWidth = logoGroup.node().getBBox().width; // + fieldMargin; //field group width + space between
      }

      if (pb.template().keyDoc.logoText) { //if logoText exists
        //update rectangle size
        logoGroup.select('rect').remove();

        //add/update the rectangle around the field to match the text size
        setFieldRect(logoGroup)
          .attr('data-target', "logo");

      } else {

        logoGroup.select('rect') //set a default box size for empty logo text
          .attr('width', 120)
          .attr('height', 20);

      }



    }



    //////////////////////////////////////////////////////////////////////////
    //
    // Public Functions
    //
    //
    //////////////////////////////////////////////////////////////////////////

    pb.fields = {

      /* set svg text fields to match pass json data */
      set: function (fieldArray, fieldType) {
        setPassFields(fieldArray, fieldType);
      },
      /* set svg logo to match pass json data */
      setLogo: function () {
        setLogo();
      },
      name: function () {
        return 'infoField';
      }
    };

  }(passNinja.toolkit, this.passBuilder = passNinja.passBuilder || {}));

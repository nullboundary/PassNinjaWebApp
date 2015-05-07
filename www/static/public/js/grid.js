(function(app, $, undefined) {

  'use strict';

  var styles;
  var afterRuleIndex;
  var dtRuleIndex;
  var transSpeed = 450;
  var expanderHeight = 300;

  /***********************************************************
  expandInfo expands the info panel for the selected pass.

  ***********************************************************/
  function expandInfo() {

      var activePass = app.getPassActive();
      var expandedItem = d3.select('.expanded'); //current open <li>
      var activeItem = d3.select(d3.select(activePass.rootID).node().parentNode); //soon to open <li>

      if (expandedItem.empty()) { //no panel expanded
        openExpander(activeItem);
      } else if (isExpanded()) { //a panel is already expanded
        closeExpander(expandedItem);
      } else if (activeItem.node().offsetTop == expandedItem.node().offsetTop) { //selection in same row
        moveExpander(expandedItem, activeItem);
      } else { //selection in new row
        closeExpander(expandedItem);
        openExpander(activeItem);
      }


    }
    /***********************************************************
    openExpander opens a panel info expander when a pass is clicked
    in a different row uses height change transistions

    ***********************************************************/
  function openExpander(activeItem) {

      var activeID = activeItem.attr('id');
      var expHeight = expanderHeight; //height of expander info <div>
      var passHeight = activeItem.select('a').node().offsetHeight;
      var itemHeight = expHeight + passHeight; //the height of <li>


      //set new <li> height
      activeItem
        .classed("expanded", true)
        .style('height', passHeight + 'px')
        .each(function(d, i) {
          var rule = styles.cssRules.item(afterRuleIndex); // get css rule from sheet for <a::after> using index
          rule.style['border-bottom-color'] = d.keyDoc.backgroundColor; //change <a::after>
        });

      //add expander div to place content into
      var expand = activeItem.append('div')
        .attr('class', 'expander')
        .attr('id', activeID + '-exp')
        .style('height', 0 + 'px')
        .style('background-color', function(d, i) {
          return d.keyDoc.backgroundColor;
        })
        .each(buildExpander);

      //scroll grid
      var menuTopMargin = d3.select('.nav-menu').node().offsetHeight + 15; //menu bottom + extra
      scrollGrid(activeItem, menuTopMargin);

      //transistion the height of both <li.expanded> and <div.expander> simultaniously
      activeItem //uses css transistion
        .style('height', function(d, i) {
        return itemHeight + 'px';
      });

      expand //uses css transistion
        .style('height', function(d, i) {
        return expHeight + 'px';
      });


    }
    /***********************************************************
    moveExpander opens a panel info expander when a pass is clicked
    in a the same row, uses opacity change transistions

    ***********************************************************/
  function moveExpander(previousItem, activeItem) {

      var activeID = activeItem.attr('id');
      var bgColor;
      var expHeight = expanderHeight; //height of expander info <div>
      var itemHeight = expHeight + activeItem.select('a').node().offsetHeight; //the height of <li>

      //set expanded class to new <li>
      //set new <li> height
      activeItem.classed('expanded', true)
        .style('height', itemHeight + 'px')
        .each(function(d, i) {
          bgColor = d.keyDoc.backgroundColor;
          var rule = styles.cssRules.item(afterRuleIndex); // get css rule from sheet for <a::after> using index
          rule.style['border-bottom-color'] = bgColor; //change <a::after>
        });

      //remove old <li> expanded class
      previousItem.classed('expanded', false)
        .style('height', null);

      d3.transition()
        .duration(transSpeed / 2)
        .each(function() {

          //add back expander div to place content into
          var expand = activeItem.append('div')
            .attr('class', 'expander')
            .attr('id', activeID + '-exp')
            .style('opacity', 0) //add it with 0
            .transition()
            .style('opacity', 1) //slow transistion to opacity 1 and new color
            .style('background-color', function(d, i) {
              return d.keyDoc.backgroundColor;
            })
            .each("end", buildExpander); //when fade in finishes add text info

          previousItem.select('.expander') //fade the previous background
            .transition()
            .style('opacity', 0);

          previousItem.select('.expand-inner') //fade the text
            .transition()
            .style('opacity', 0)
            .each("end", function() { //when fade out finishes

              previousItem.select('.expander')
                .remove();
            });
        });

      //scroll grid
      var menuTopMargin = d3.select('.nav-menu').node().offsetHeight + 15; //menu bottom + extra
      scrollGrid(activeItem, menuTopMargin);

    }
    /***********************************************************
    closeExpander closes an open expander info panel.

    ***********************************************************/
  function closeExpander(previousItem) {

    if (!previousItem.empty()) {

      var prevExpander = previousItem.select('.expander');
      var passHeight = previousItem.select('a').node().offsetHeight;

      //1. remove old <li> expanded class
      previousItem.classed('expanded', false)
        .style('height', passHeight + 'px'); //uses css transistion

      //2. remove old <li> height
      prevExpander
        .style('height', 0 + 'px'); //uses css transistion

      //2. remove old <li> height
      d3.transition()
        .duration(transSpeed)
        .each("end", function() {

          prevExpander
            .remove(); //remove expander when complete

          previousItem
            .style('height', null); //remove height style

        });

    }

  }

  /***********************************************************
  buildExpander stamps the expander template and fills in the info

  ***********************************************************/
  function buildExpander() {
    var expander = d3.select(this);
    var expID = expander.attr('id');

    //add expander template
    app.toolkit.stampTemplate('template#expand-template', 'div#' + expID);

    expander.select('.expand-title').text(function(d, i) {
      return d.name;
    });
    expander.select('.expand-desc').text(function(d, i) {
      return d.keyDoc.description;
    });

    //set expander fields
    expander.select('.expand-passtype').text(passNinja.getPassModel().passtype);

    //set status color and value
    if (passNinja.getPassModel().status == "ready") {
      //expander.select('.expand-status').style('color', 'green');
      expander.select('.expand-status').text(passNinja.getPassModel().status);

      var url = window.location.protocol + '//' + window.location.host + '/pass/1/passes/' + passNinja.getPassModel().filename;

      var link = '<a href="' + url + '">' + passNinja.getPassModel().filename + '</a>';
      expander.select('.expand-link').html(link);

      expander
        .each(function(d) {

          //find the darkest color on the pass
          var colorDark;
          var color1 = tinycolor(d.keyDoc.labelColor);
          var color2 = tinycolor(d.keyDoc.foregroundColor);

          if (color1.getBrightness() > color2.getBrightness()) {
            colorDark = d.keyDoc.foregroundColor;
          } else {
            colorDark = d.keyDoc.labelColor;
          }

          var qrcode = new QRCode(expander.select('#expand-qr').node(), {
            text: url,
            colorDark: colorDark,
            colorLight: 'rgb(255,255,255)',
            correctLevel: QRCode.CorrectLevel.Q
          });
        });

    } else {
      //expander.select('.expand-status').style('color', 'red');
      expander.select('.expand-status').text('incomplete');
      expander.select('#expand-qr').call(app.toolkit.hide);
    }

    //format & set time/date
    var timeFormat = d3.time.format('%c');
    var fdate = new Date(passNinja.getPassModel().updated);
    expander.select('.expand-updated').text(timeFormat(fdate));

    //TODO: this changes ALL <dt> styles in the page. Only want to change the current expander panel.
    expander
      .each(function(d) {
        var rule = styles.cssRules.item(dtRuleIndex); // get css rule from sheet for <a::after> using index
        rule.style['color'] = d.keyDoc.labelColor; //change <a::after>
      });

    //fade in <div.expand-inner> text - /2 for crossfade speed
    expander.select('.expand-inner').transition()
      .duration(transSpeed / 2)
      .style('opacity', 1)
      .style('color', function(d, i) {
        return d.keyDoc.foregroundColor;
      });

    //add load editor event to edit pass button
    d3.select('.expand-edit-btn')
      .on('click', function() {
        app.setEditorPage(false); //false = not new pass, editing old pass.
      });

    //add event handler for delete button
    d3.select('.expand-del-btn')
      .on('click', function() {
        app.delPassModel();
        expander //TODO: transistion this
          .remove(); //remove expander
        buildPassGrid();

      });


  }

  /***********************************************************
  scrollGrid moves the passgrid up so the selected pass and
  open panel are in view.

  ***********************************************************/
  function scrollGrid(item, menuTopMargin) {

    var position = item.node().offsetTop;

    //if prev open panel is higher then next opening panel, need to subtract prev panel height.
    if (isLowerRow(position)) {
      position = position - expanderHeight;
    }
    var passHeight = item.select('a').node().offsetHeight;
    var expanderTop = position + passHeight;
    var scrollVal;

    // case 1 : expander height + pass height fits in window´s height
    if ((expanderHeight + passHeight + menuTopMargin) <= window.innerHeight) {
      console.log(position);
      scrollVal = position - menuTopMargin;

      console.log("1:" + scrollVal);

      // case 2 : expander height + pass height does not fit in window´s height and expander height is smaller than window´s height
    } else if (expanderHeight < window.innerHeight) {
      scrollVal = expanderTop - (window.innerHeight - expanderHeight);
      console.log("2:" + scrollVal);

      // case 3 : expander height + pass height does not fit in window´s height and expander height is bigger than window´s height
    } else {
      scrollVal = expanderTop;
      console.log("3:" + scrollVal);

    }
    //create a tween to scrollTop to the scrollVal
    d3.select('.container').transition().duration(transSpeed)
      .tween("scrollContainerTween", scrollTopTween(scrollVal));
  }

  /***********************************************************
  isLowerRow tests whether the next expander is lower on the page
  then the current expander.

  ***********************************************************/
  function isLowerRow(position) {

    var expanderList = d3.selectAll('.expander');
    var numExpander = expanderList.size();

    if (numExpander > 1) { //if 2 open expanders in transistion
      if (expanderList[0][0].offsetTop < position) { //if previous <li> is higher
        return true;
      }
    }
    return false;
  }

  /***********************************************************


  ***********************************************************/
  function scrollTopTween(scrollTop) {
    return function() {
      var i = d3.interpolateNumber(this.scrollTop, scrollTop);
      return function(t) {
        this.scrollTop = i(t);
      };
    };
  }

  /***********************************************************
  isExpanded tests if the current selected pass is already expanded.

  ***********************************************************/
  function isExpanded() {
    var expandedItem = d3.select('.expanded');
    if (!expandedItem.empty()) {
      var expID = expandedItem.attr('id');
      console.log("expandedID:" + expID + " rootID:" + app.getPassActive().rootID);
      if (('#' + expID + ' a') == app.getPassActive().rootID) {
        return true;
      }
    }
    return false;
  }

  /***********************************************************


  ***********************************************************/
  function buildPassGrid() {

    var gridList = d3.select('ul#og-grid');


    //gridList.selectAll('li.grid-pass')
    //.remove();

    //bind dataset
    var passListItems = gridList.selectAll('li.grid-pass').data(app.getPassModelList());

    //add <li>
    passListItems.enter().append('li')
      .attr('class', 'grid-pass')
      .attr('id', function(d, i) {
        return 'pass-' + i;
      })
      .on('click', function(d, i) {
        app.setPassActive('#pass-' + i + ' a', i); //grid passes are in an <a> so add extra ' a'
        expandInfo(); //expand info panel about pass if clicked.
      });

    passListItems.exit().remove();

    //clear old passes a if they exist
    passListItems.select('a').remove();

    //add <a>
    var passAnchor = passListItems.append('a')
      //	.attr('href', '#')
      .attr('data-title', function(d) {
        return d.name
      })
      .attr('data-description', function(d) {
        return d.keyDoc.description
      });

    // get last stylesheet (probably builder.css)
    styles = document.styleSheets[document.styleSheets.length - 1];

    // insert an empty css rule just to create a new CSSStyleRule object, at end of sheet. to color <a::after>
    afterRuleIndex = styles.insertRule(".og-grid li.expanded > a::after {}", styles.cssRules.length);
    dtRuleIndex = styles.insertRule(".dl-inline dt {}", styles.cssRules.length);

    //add <svg> for each pass listed in the data array.
    passAnchor.each(function(d, i) {
      var shadowRootElm = this.createShadowRoot();
      app.toolkit.loadSVG(d.passtype, function(error, xml) { //svg load callback

        if (app.toolkit.checkLoadError(error)) return;

        var wrapSVG = wrap(xml.documentElement); //wrap the svg in webcomponents.js polyfill for use with shadowdom
        shadowRootElm.appendChild(wrapSVG); //append svg

        app.setPassActive('#pass-' + i + ' a', i); //set this pass as active
        console.log(passNinja.getSvgRoot());

        //set all <svg> to have unique ids and unique <lineargradiant> ids
        passNinja.getSvgRoot().select('svg').attr('id', d.passtype + i);
        passNinja.getSvgRoot().select('#linear-grad').attr('id', 'linear-' + d.passtype + i);
        passNinja.getSvgRoot().select('.bg-grad').attr('fill', 'url(#linear-' + d.passtype + i + ")");

        app.passBuilder.build(); //build it

      });
    });

  }

  /***********************************************************
  bindPassData is the callback for the xhr pass data fetch

  ***********************************************************/
  function bindPassData(error, data) {

    if (app.toolkit.checkLoadError(error)) return;

    console.log(data);
    app.setPassModelList(data); //set master pass data list

    //no passes? Set the heading message.
    if (app.getNumPassModel() <= 0) {
      d3.select('#emptyGridHeading').call(app.toolkit.show);
      d3.select('#gridHeading').call(app.toolkit.hide);
    }

    buildPassGrid();
  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  app.grid = {

    init: function() {

      //load grid template
      var gridElem = app.toolkit.stampTemplate('template#pass-grid', 'body');

      if (app.getNumPassModel() == 0) {
        //get all user passes from server
        d3.json("/api/v1/passes")
          .header("Authorization", "Bearer " + app.toolkit.getToken())
          .get(bindPassData);
      } else {
        buildPassGrid();
      }

      //add event to new pass button.
      d3.select('button#new-pass')
        .on('click', function() {
          app.setEditorPage(true);
        });

    }


  };


}(passNinja = window.passNinja || {}, jQuery));
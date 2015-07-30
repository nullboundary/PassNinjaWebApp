(function (window, document) {

  document.addEventListener('scroll', onScroll);

  //update menu and hash on click.
  document.querySelector('a[href^="#"]').addEventListener('click', function (e) {

      e.preventDefault();
      document.removeEventListener('scroll',onScroll);

      [].forEach.call(document.querySelectorAll('a'), function (el) {
          removeClass(el, 'pure-menu-selected');
      });
      addClass(this, 'pure-menu-selected');

       var target = this.hash;
       window.location.hash = target;
       document.addEventListener('scroll', onScroll);

});

//update menu on scroll of api document
function onScroll(event){
  var scrollPos = document.body.scrollTop;

  [].forEach.call(document.querySelectorAll('.pure-menu-link'), function (el) {

      var currLink = el;
      var refElement = document.querySelector(currLink.getAttribute("href"));

      if (refElement.offsetTop <= scrollPos && refElement.offsetTop + refElement.offsetHeight > scrollPos) {

          var prevActive = document.querySelector('.pure-menu-selected');
          if (prevActive) {
            removeClass(prevActive,'pure-menu-selected');
            var target = currLink.hash;
            window.location.hash = target;
            document.body.scrollTop = scrollPos;
          }
          addClass(currLink,'pure-menu-selected');
      }
      else{
          removeClass(currLink,'pure-menu-selected');
      }
  });
}

  //menu item selected
  [].forEach.call(document.querySelectorAll('.pure-menu-item'), function (el) {
    el.addEventListener('click', function (e) {
      //remove previous selected class
      removeClass(document.querySelector('.pure-menu-selected'),'pure-menu-selected');
      //add selected class to clicked element
      addClass(this,'pure-menu-selected');

    }, false);
  });

  //Toggle menu
  var layout   = document.getElementById('layout'),
      menu     = document.getElementById('menu'),
      menuLink = document.getElementById('menuLink');

  function toggleClass(element, className) {
      var classes = element.className.split(/\s+/),
          length = classes.length,
          i = 0;

      for(; i < length; i++) {
        if (classes[i] === className) {
          classes.splice(i, 1);
          break;
        }
      }
      // The className is not found
      if (length === classes.length) {
          classes.push(className);
      }

      element.className = classes.join(' ');
  }

  function addClass(element, className) {
    if (element.classList) {
      element.classList.add(className);
    } else {
      element.className += ' ' + className;
    }
  }

  function removeClass(element, className) {
    if (element.classList) {
      element.classList.remove(className);
    } else {
    element.className = element.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
    }
  }

  menuLink.onclick = function (e) {
      var active = 'active';

      e.preventDefault();
      toggleClass(layout, active);
      toggleClass(menu, active);
      toggleClass(menuLink, active);
  };

}(this, this.document));

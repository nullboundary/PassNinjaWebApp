angular.module('passNinja', ['satellizer'])
  .config(function($authProvider) {

    $authProvider.facebook({
      clientId: '624059410963642',
    });

    $authProvider.google({
      clientId: '631036554609-v5hm2amv4pvico3asfi97f54sc51ji4o.apps.googleusercontent.com'
    });

    $authProvider.github({
      clientId: '0ba2600b1dbdb756688b'
    });

    $authProvider.linkedin({
      clientId: '77cw786yignpzj'
    });

    $authProvider.yahoo({
      clientId: 'dj0yJmk9dkNGM0RTOHpOM0ZsJmQ9WVdrOVlVTm9hVk0wTkRRbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD0wMA--'
    });

    $authProvider.twitter({
      url: '/auth/twitter'
    });

    $authProvider.oauth2({
      name: 'foursquare',
      url: '/auth/foursquare',
      redirectUri: window.location.origin,
      clientId: 'MTCEJ3NGW2PNNB31WOSBFDSAD4MTHYVAZ1UKIULXZ2CVFC2K',
      authorizationEndpoint: 'https://foursquare.com/oauth2/authenticate',
    });

  });

angular.module('passNinja')
  .controller('NavbarCtrl', function($scope, $auth) {
    $scope.isAuthenticated = function() {
      return $auth.isAuthenticated();
    };
  });

angular.module('passNinja')
  .controller('LoginCtrl', function($scope, $auth) {

    $scope.authenticate = function(provider) {
      $auth.authenticate(provider);
    };

  });

(function() {
    'use strict';

    angular.module('app.config', [])
        .service("Constants", function($location) {
            this.apiUrl = function() {
                console.log($location.host());
                if ( $location.host() == "localhost" ) {
                    return "http://localhost:1466";
                } else if ( $location.host() == "auction.svuus.org" || $location.host() == 'svuus-auction-web.s3-website-us-west-2.amazonaws.com' || $location.host() == 'dakq62eaafsg6.cloudfront.net' ) {
                    return "https://crzn32fb93.execute-api.us-west-2.amazonaws.com/prod";
                }
            };
        });

})();

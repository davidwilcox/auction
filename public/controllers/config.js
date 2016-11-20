
(function() {
    'use strict';

    angular.module('app.config', [])
        .service("Constants", function($location) {
            this.apiUrl = function() {
                console.log($location.host());
                if ( $location.host() == "localhost" ) {
                    return "http://localhost:1465";
                } else if ( $location.host() == "auction.svuus.org" || $location.host() == 'svuus-auction-web.s3-website-us-west-2.amazonaws.com' || $location.host() == 'dakq62eaafsg6.cloudfront.net' ) {
                    return "https://pmbnpcsn2l.execute-api.us-west-2.amazonaws.com/prod/";
                }
            };
            this.stripeKey = function() {
                if ( $location.host() == "localhost" ) {
                    return "pk_test_TplRtT5yloUqkARvZ1QR4dzt";
                } else if ( $location.host() == "www.custodyscheduler.com" || $location.host() == 'svuus-auction-web.s3-website-us-west-2.amazonaws.com' || $location.host() == 'dakq62eaafsg6.cloudfront.net' ) {
                    return "pk_live_lIc5KX2LtY8sLcO2qkon1AFn";
                }
            };
        });

})();

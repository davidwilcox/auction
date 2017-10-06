
(function() {
    'use strict';

    angular.module('app.config', [])
        .service("Constants", function($location) {
            this.apiUrl = function() {
                console.log($location.host());
                if ( $location.host() == "localhost" ) {
                    return "http://localhost:1466";
                } else if ( $location.host() == "auction.svuus.org" || $location.host() == 'svuus-auction-web.s3-website-us-west-2.amazonaws.com' || $location.host() == 'dakq62eaafsg6.cloudfront.net' ) {
                    return "https://nnr40fq1oj.execute-api.us-west-2.amazonaws.com/prod";
                }
            };
            this.stripeKey = function() {
                console.log($location.host());
                if ( $location.host() == "localhost" ) {
                    console.log('returning:' + "pk_test_TplRtT5yloUqkARvZ1QR4dzt");
                    return "pk_test_TplRtT5yloUqkARvZ1QR4dzt";
                } else if ( $location.host() == "auction.svuus.org" || $location.host() == 'svuus-auction-web.s3-website-us-west-2.amazonaws.com' || $location.host() == 'dakq62eaafsg6.cloudfront.net' ) {
                    console.log('returning:' + "pk_live_Xhog0FzMxJt1QhvbsByoOJKr");
                    return "pk_live_Xhog0FzMxJt1QhvbsByoOJKr";
                }
            };
        });

})();

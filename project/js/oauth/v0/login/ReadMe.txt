About the FileMaker WebDirect OAuth scripts
===========================================

The included files provide methods to programmatically
  authenticate FileMaker web clients using OAuth Identity
  Providers.


Included files
==============
1. fmwebd_oauth_script_edit.js
      This script provides editable code to help OAuth
      sign-in. Use this file if you need to edit your
      sign-in process or workflow.
2. fmwebd_oauth_script.js
      The code in this file provides a minified version of
      fmwebd_oauth_script_edit.js with the same method names
      and processes as the editable version. This version
      obscures the sign-in code, hiding the details from
      the end users. This file should be used in production
      instead of the editable version unless modifications
      are needed.
3. fmwebd_oauth_example.html
      The sample code in this file implements a Google OAuth
      sign-in using the provided minified script. You
      must update the database name variable (dbName) and
      configure your database to use Google OAuth to test this
      sign-in sample code.


Included methods
================
    getProviderInfo(callback: function): void
        Get the list of OAuth providers supported by this
          server.

        Parameters:
        - callback(providerInfo: string): void
            A callback function which will be invoked when
              dbserver returns provider info.
            - providerInfo: A JSON string.

        Return value:
        - None.


    getOAuthURL(trackingId: string, masterAddr: string,
      provider: string, callback: function): void
        Send an authentication request to the OAuth
          provider.

        Parameters:
        - trackingId:
            An user defined random string which is used to
              identify the correct OAuth authentication
              response from provider.
        - masterAddr:
            The URL of master instance if in mWPE set up.
              Otherwise it's usually the value below:
              https://{$masterAddr}/fmi/webd
        - provider:
            Name of the OAuth provider. It can be obtained
              from provider info.
        - callback(oauthUrl: string, requestId: string):
          void
            A callback function which will be invoked when
              the OAuth server finishes initializing the
              authentication request. Note that the
              callback needs to register the localstorage
              event in order to receive the OAuth
              authentication response from provider.
            - oauthUrl:
                The url to the login UI.
            - requestId:
                Provider generated request ID used for
                  authentication validation by dbserver.

        Return value:
        - None.


    doOAuthLogin(dbName: string, requestId: string,
      identifier: string, homeurl: string,
      autherr: string): void
        Perform a FileMaker database login.

        Parameters:
        - dbName:
            The name of the database to be signed in.
        - requestId:
            The request ID generated in the last step for
              authentication validation.
        - identifier:
            An OAuth parameter also used for authentication
              validation. Returned in the OAuth response.
        - homeurl:
        	The custom homepage where web users are returned
        	  to when they sign out
        - autherr:
            Result of OAuth authentication. Returned in the
              OAuth response.

        Return value:
        - None.

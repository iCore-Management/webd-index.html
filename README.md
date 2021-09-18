# webd-index.html
FileMaker Server root web index file

# Description
This file that can be placed in the root folder which detects when the back button is pressed in the web browser and displays a customized alert warning the user that the back button is disabled for this application. This alert is only active while they are within the WebDirect session on this server, and stops once they navigate away to another website.  Share your issues and suggestions there to improve the file.

# Installation
Place the index file in the FileMaker Web Server Root.  The default web server root is located here, https://help.claris.com/en/server-help/content/hostsite-fmwd.html:

Windows: [drive]:\Program Files\FileMaker\FileMaker Server\HTTPServer\conf

macOS for HTTP URLs: /Library/FileMaker Server/HTTPServer/htdocs

macOS for HTTPS URLs: /Library/FileMaker Server/HTTPServer/htdocs/httpsRoot

Linux for HTTP: /opt/FileMaker/FileMaker Server/HTTPServer/htdocs

Linux for HTTPS: /opt/FileMaker/FileMaker Server/HTTPServer/htdocs/httpsRoot

/*global KApp,KCtrlFormAttacher,KCtrlDocumentTextEdit*/

/* Haplo Platform                                     http://haplo.org
 * (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.         */


KApp.j__onPageLoad(function() {
  var a = new KCtrlFormAttacher('z__setup_application_copyright_form');
  a.j__attach((new KCtrlDocumentTextEdit()).j__attach('z__setup_application_copyright_statement'), 'copyright_statement');
});

# Haplo Platform                                     http://haplo.org
# (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


module KHooks

  define_hook :hUsersChanged do |h|
  end

  define_hook :hUserPermissionRules do |h|
    h.argument    :user,      User,     "SecurityPrincipal being queried"
    h.result      :rules,     "js:LabelStatementsBuilder",   nil,  "LabelStatementsBuilder object representing extra rules added by plugin"
  end

  define_hook :hUserLabelStatements do |h|
    h.argument    :user,      User,     "SecurityPrincipal being queried"
    h.result      :statements,KLabelStatements,   nil,  "LabelStatements object representing the permissions, which can be replaced by a plugin"
  end

end

# Haplo Platform                                     http://haplo.org
# (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


# Provide utility functions to KKeychainCredential JavaScript objects

module JSKKeychainCredentialSupport

  def self.query(kind)
    q = KeychainCredential.order(:name)
    q = q.where(:kind => kind) if kind
    JSON.dump(q.map do |e|
      {:id => e.id, :kind => e.kind, :name => e.name}
    end)
  end

  def self.load(id, name)
    KeychainCredential.where((id > 0) ? {:id=>id} : {:name=>name}).first()
  end

  def self.encode(credential, encoding)
    raise JavaScriptAPIError, "Unknown encoding #{encoding}" unless encoding == "http-authorization"
    username = credential.account['Username']
    password = credential.secret['Password']
    raise JavaScriptAPIError, "Credential does not contain Username and Password" unless username && password
    auth = ["#{username}:#{password}".encode(Encoding::UTF_8)].pack('m').gsub(/[\r\n]+/,'')
    "Basic #{auth}"
  end

end

Java::OrgHaploJsinterface::KKeychainCredential.setRubyInterface(JSKKeychainCredentialSupport)

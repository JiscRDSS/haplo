# Haplo Platform                                     http://haplo.org
# (c) Haplo Services Ltd 2006 - 2016    http://www.haplo-services.com
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.


# Helpers for writing the JS interface to ActiveRecord objects.
# See src/main/java/org/haplo/jsinterface/app/README.txt

module KActiveRecordJavaInterface
  def self.make_jsset_methods(klass, *methods)
    code = ''
    methods.each do |name|
      code << "def jsset_#{name}(x); self.#{name}=(x); end\n"
    end
    klass.module_eval(code)
  end
  def self.make_date_methods(klass, attribute, getter = nil, setter = nil)
    code = ''
    code << "def #{getter}; d = self.#{attribute}; d ? (d.to_i * 1000) : nil; end\n" if getter
    raise "Not implemented" if setter
    klass.module_eval(code)
  end
end

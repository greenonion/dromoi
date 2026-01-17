# frozen_string_literal: true

require 'bundler/setup'
require 'webrick'

root = File.expand_path(__dir__)
server = WEBrick::HTTPServer.new(Port: 8000, DocumentRoot: root)

trap('INT') { server.shutdown }
server.start

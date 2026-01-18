# frozen_string_literal: true

require 'bundler/setup'
require 'webrick'

root = File.expand_path(__dir__)
dist_root = File.join(root, 'dist')
roots = File.directory?(dist_root) ? [dist_root, root] : [root]
server = WEBrick::HTTPServer.new(Port: 8000)

server.mount_proc('/') do |request, response|
  found_root = roots.find do |root_path|
    requested_path = File.expand_path(File.join(root_path, request.path))
    next false unless requested_path.start_with?(root_path)

    if File.directory?(requested_path)
      index_path = File.join(requested_path, 'index.html')
      File.file?(index_path)
    else
      File.file?(requested_path)
    end
  end

  if found_root
    WEBrick::HTTPServlet::FileHandler.new(server, found_root).service(request, response)
  else
    response.status = 404
    response.body = 'Not Found'
  end
end

trap('INT') { server.shutdown }
server.start

class AudioStreamingController < ApplicationController
  def index
  end

  def stream
    # Handle the Bunny.net streaming endpoint
    audio_data = request.raw_post

    # Configure your Bunny.net Stream settings
    stream_library_id = params[:stream_library_id] || ENV['BUNNY_STREAM_LIBRARY_ID']
    stream_key = params[:stream_key] || ENV['BUNNY_STREAM_KEY']

    if stream_library_id.blank? || stream_key.blank?
      render json: { error: 'Stream configuration missing' }, status: 400
      return
    end

    bunny_response = stream_to_bunny(audio_data, stream_library_id, stream_key)
    render json: { success: true, response: bunny_response }
  rescue => e
    Rails.logger.error "Bunny.net streaming error: #{e.message}"
    render json: { error: 'Streaming failed' }, status: 500
  end

  private

  def stream_to_bunny(audio_data, library_id, stream_key)
    require 'net/http'
    require 'uri'

    # Bunny.net Stream API endpoint
    uri = URI("https://video.bunnycdn.com/library/#{library_id}/videos")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    request = Net::HTTP::Post.new(uri)
    request['AccessKey'] = stream_key
    request['Content-Type'] = 'audio/webm'
    request.body = audio_data

    response = http.request(request)
    JSON.parse(response.body) if response.body
  end
end

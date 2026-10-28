import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

class ApiService {
  final String baseUrl;

  ApiService(this.baseUrl);

  // Fetch URL information
  Future<Map<String, dynamic>> fetchInfo(String url) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/info'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'url': url}),
    );
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to analyze URL');
    }
  }

  // Start an async download
  Future<Map<String, dynamic>> startDownload(
      String url, String formatId, String ext, String mediaType, {String? audioBitrate}) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/start_download'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'url': url,
        'format_id': formatId,
        'ext': ext,
        'media_type': mediaType,
        'audio_bitrate': audioBitrate ?? '320k',
        'device_id': 'flutter_app_client',
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Failed to initiate download');
    }
  }

  // Get download status
  Future<Map<String, dynamic>> getDownloadStatus(String jobId) async {
    final response = await http.get(Uri.parse('$baseUrl/api/download_status/$jobId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to check download status');
    }
  }

  // Download the finished file and save it to the local system
  Future<File> saveFile(String jobId, String fileName) async {
    final response = await http.get(Uri.parse('$baseUrl/api/download_file/$jobId'));
    if (response.statusCode == 200) {
      Directory? dir;
      if (Platform.isAndroid) {
        dir = Directory('/storage/emulated/0/Download');
        if (!await dir.exists()) {
          dir = await getExternalStorageDirectory();
        }
      } else {
        dir = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
      }

      final file = File('${dir!.path}/$fileName');
      await file.writeAsBytes(response.bodyBytes);
      return file;
    } else {
      throw Exception('Failed to retrieve file from server');
    }
  }

  // Extract audio from local video file
  Future<File> convertVideoToAudio(File videoFile, String ext) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/convert-to-audio'));
    request.fields['device_id'] = 'flutter_app_client';
    request.fields['ext'] = ext;
    request.files.add(await http.MultipartFile.fromPath('file', videoFile.path));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      final dir = await getDownloadsDirectory() ?? await getApplicationDocumentsDirectory();
      final outName = '${DateTime.now().millisecondsSinceEpoch}.$ext';
      final file = File('${dir.path}/$outName');
      await file.writeAsBytes(response.bodyBytes);
      return file;
    } else {
      throw Exception('Conversion failed');
    }
  }
}
}

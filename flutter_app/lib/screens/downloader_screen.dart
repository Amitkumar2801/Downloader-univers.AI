import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart';
import '../services/api_service.dart';

class DownloaderScreen extends StatefulWidget {
  const DownloaderScreen({super.key});

  @override
  State<DownloaderScreen> createState() => _DownloaderScreenState();
}

class _DownloaderScreenState extends State<DownloaderScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isLoading = false;
  String? _statusText;
  Map<String, dynamic>? _mediaInfo;
  String? _selectedFormatId;
  String _selectedExt = 'mp3';
  String _mediaType = 'audio'; // 'audio' or 'video'
  double _progress = 0.0;
  bool _isDownloading = false;

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _analyzeLink() async {
    final state = DownloaderApp.of(context)!;
    final api = ApiService(state.backendUrl);
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    setState(() {
      _isLoading = true;
      _statusText = 'Analyzing link...';
      _mediaInfo = null;
    });

    try {
      final info = await api.fetchInfo(url);
      setState(() {
        _mediaInfo = info;
        _isLoading = false;
        _statusText = null;

        // Auto-select first format
        if (info['formats'] != null && (info['formats'] as List).isNotEmpty) {
          _selectedFormatId = info['formats'][0]['format_id'];
          _selectedExt = info['formats'][0]['ext'] ?? 'mp4';
          _mediaType = info['formats'][0]['vcodec'] != 'none' ? 'video' : 'audio';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusText = 'Error: ${e.toString().replaceAll('Exception:', '')}';
      });
    }
  }

  Future<void> _startDownload() async {
    final state = DownloaderApp.of(context)!;
    final api = ApiService(state.backendUrl);
    final url = _urlController.text.trim();

    if (_selectedFormatId == null || url.isEmpty) return;

    setState(() {
      _isDownloading = true;
      _progress = 0.0;
      _statusText = 'Starting download job...';
    });

    try {
      final job = await api.startDownload(
        url,
        _selectedFormatId!,
        _selectedExt,
        _mediaType,
      );

      final jobId = job['job_id'];
      _pollDownloadStatus(jobId);
    } catch (e) {
      setState(() {
        _isDownloading = false;
        _statusText = 'Download initiation error: $e';
      });
    }
  }

  void _pollDownloadStatus(String jobId) {
    final state = DownloaderApp.of(context)!;
    final api = ApiService(state.backendUrl);

    Timer.periodic(const Duration(seconds: 1), (timer) async {
      try {
        final status = await api.getDownloadStatus(jobId);
        final stateName = status['status'];
        final progressVal = status['progress'] ?? 0.0;
        final text = status['status_text'] ?? 'Processing...';

        setState(() {
          _progress = (progressVal is int) ? progressVal.toDouble() / 100.0 : (progressVal as double) / 100.0;
          _statusText = '$text (${(progressVal).toStringAsFixed(1)}%)';
        });

        if (stateName == 'completed') {
          timer.cancel();
          setState(() {
            _statusText = 'Saving file to device...';
          });
          final file = await api.saveFile(jobId, status['filename'] ?? 'downloaded_file.$_selectedExt');
          setState(() {
            _isDownloading = false;
            _statusText = 'Success! File saved to:\n${file.path}';
          });
        } else if (stateName == 'failed') {
          timer.cancel();
          setState(() {
            _isDownloading = false;
            _statusText = 'Error: ${status['error'] ?? 'Download failed on server'}';
          });
        }
      } catch (e) {
        timer.cancel();
        setState(() {
          _isDownloading = false;
          _statusText = 'Polling error: $e';
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.translate(context, 'downloader_title')),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // URL Input bar
            TextField(
              controller: _urlController,
              decoration: InputDecoration(
                hintText: AppTranslations.translate(context, 'enter_url'),
                prefixIcon: const Icon(Icons.link, color: Color(0xFFF97316)),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => _urlController.clear(),
                ),
              ),
              onSubmitted: (_) => _analyzeLink(),
            ),
            const SizedBox(height: 16),
            
            // Analyze Button
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFFF97316),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              onPressed: _isLoading || _isDownloading ? null : _analyzeLink,
              child: _isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(AppTranslations.translate(context, 'fetch')),
            ),
            
            const SizedBox(height: 24),
            
            // Status box
            if (_statusText != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F2937),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white10),
                ),
                child: Text(
                  _statusText!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Progress bar
            if (_isDownloading) ...[
              LinearProgressIndicator(
                value: _progress,
                color: const Color(0xFFF97316),
                backgroundColor: Colors.white10,
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
              const SizedBox(height: 24),
            ],

            // Media metadata display
            if (_mediaInfo != null) ...[
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Thumbnail
                      if (_mediaInfo!['thumbnail'] != null)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            _mediaInfo!['thumbnail'],
                            height: 180,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              height: 180,
                              color: Colors.black26,
                              child: const Icon(Icons.music_video, size: 48),
                            ),
                          ),
                        ),
                      const SizedBox(height: 16),
                      
                      // Title
                      Text(
                        _mediaInfo!['title'] ?? 'Media Details',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Uploader: ${_mediaInfo!['uploader'] ?? 'Unknown'}',
                        style: const TextStyle(fontSize: 12, color: Colors.white60),
                      ),
                      const SizedBox(height: 20),
                      
                      // Format Dropdown Selector
                      const Text(
                        'Choose Download Options:',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1F2937),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedFormatId,
                            isExpanded: true,
                            dropdownColor: const Color(0xFF111827),
                            items: (_mediaInfo!['formats'] as List).map<DropdownMenuItem<String>>((format) {
                              final fNote = format['format_note'] ?? '';
                              final res = format['resolution'] ?? '';
                              final ext = format['ext'] ?? '';
                              final vcodec = format['vcodec'] ?? '';
                              final type = vcodec != 'none' ? 'Video' : 'Audio';
                              return DropdownMenuItem<String>(
                                value: format['format_id'],
                                child: Text('$type • $ext • $res $fNote'),
                              );
                            }).toList(),
                            onChanged: (value) {
                              if (value != null) {
                                final selected = (_mediaInfo!['formats'] as List)
                                    .firstWhere((f) => f['format_id'] == value);
                                setState(() {
                                  _selectedFormatId = value;
                                  _selectedExt = selected['ext'] ?? 'mp4';
                                  _mediaType = selected['vcodec'] != 'none' ? 'video' : 'audio';
                                });
                              }
                            },
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 20),
                      
                      // Download button
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          backgroundColor: const Color(0xFFF97316),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        icon: const Icon(Icons.file_download, color: Colors.white),
                        label: Text(AppTranslations.translate(context, 'download')),
                        onPressed: _isDownloading ? null : _startDownload,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

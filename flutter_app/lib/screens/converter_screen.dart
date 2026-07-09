import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../main.dart';
import '../services/api_service.dart';

class ConverterScreen extends StatefulWidget {
  const ConverterScreen({super.key});

  @override
  State<ConverterScreen> createState() => _ConverterScreenState();
}

class _ConverterScreenState extends State<ConverterScreen> {
  File? _selectedFile;
  bool _isLoading = false;
  String? _statusText;
  String _selectedExt = 'mp3';

  Future<void> _pickVideoFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.video,
        allowMultiple: false,
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFile = File(result.files.single.path!);
          _statusText = null;
        });
      }
    } catch (e) {
      setState(() {
        _statusText = 'File picking error: $e';
      });
    }
  }

  Future<void> _convertVideo() async {
    if (_selectedFile == null) return;
    final state = DownloaderApp.of(context)!;
    final api = ApiService(state.backendUrl);

    setState(() {
      _isLoading = true;
      _statusText = 'Uploading & extracting audio... (Please wait)';
    });

    try {
      final file = await api.convertVideoToAudio(_selectedFile!, _selectedExt);
      setState(() {
        _isLoading = false;
        _statusText = 'Success! Extracted audio saved to:\n${file.path}';
        _selectedFile = null;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusText = 'Conversion failed: ${e.toString().replaceAll('Exception:', '')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.translate(context, 'converter_title')),
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
            // Pick File card container
            GestureDetector(
              onTap: _isLoading ? null : _pickVideoFile,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.3), width: 2),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.video_library, size: 54, color: Color(0xFF6366F1)),
                    const SizedBox(height: 16),
                    Text(
                      _selectedFile != null
                          ? _selectedFile!.path.split(Platform.pathSeparator).last
                          : AppTranslations.translate(context, 'select_file'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    if (_selectedFile != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        'Size: ${(_selectedFile!.lengthSync() / (1024 * 1024)).toStringAsFixed(1)} MB',
                        style: const TextStyle(fontSize: 12, color: Colors.white54),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            if (_selectedFile != null) ...[
              // Audio format options
              const Text(
                'Target Audio Format:',
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
                    value: _selectedExt,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF111827),
                    items: const [
                      DropdownMenuItem(value: 'mp3', child: Text('MP3 (Highly Compatible)')),
                      DropdownMenuItem(value: 'wav', child: Text('WAV (Lossless Uncompressed)')),
                      DropdownMenuItem(value: 'flac', child: Text('FLAC (Lossless Compressed)')),
                      DropdownMenuItem(value: 'm4a', child: Text('M4A (AAC Audio)')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() {
                          _selectedExt = value;
                        });
                      }
                    },
                  ),
                ),
              ),
              const SizedBox(height: 24),
              
              // Convert Button
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF6366F1),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.music_video, color: Colors.white),
                label: Text(AppTranslations.translate(context, 'convert_btn')),
                onPressed: _isLoading ? null : _convertVideo,
              ),
              const SizedBox(height: 24),
            ],

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
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, height: 1.4),
                ),
              ),
              const SizedBox(height: 24),
            ],

            // Loading indicator
            if (_isLoading) ...[
              const Center(
                child: CircularProgressIndicator(color: Color(0xFF6366F1)),
              ),
              const SizedBox(height: 24),
            ],
          ],
        ),
      ),
    );
  }
}

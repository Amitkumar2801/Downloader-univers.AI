import 'dart:io';
import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import '../main.dart';
import '../services/api_service.dart';

class TrimmerScreen extends StatefulWidget {
  const TrimmerScreen({super.key});

  @override
  State<TrimmerScreen> createState() => _TrimmerScreenState();
}

class _TrimmerScreenState extends State<TrimmerScreen> {
  File? _selectedFile;
  bool _isLoading = false;
  String? _statusText;
  final TextEditingController _startController = TextEditingController(text: '0.0');
  final TextEditingController _endController = TextEditingController(text: '30.0');

  @override
  void dispose() {
    _startController.dispose();
    _endController.dispose();
    super.dispose();
  }

  Future<void> _pickAudioFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
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

  Future<void> _trimAudio() async {
    if (_selectedFile == null) return;
    final state = DownloaderApp.of(context)!;
    final api = ApiService(state.backendUrl);

    final start = double.tryParse(_startController.text) ?? 0.0;
    final end = double.tryParse(_endController.text) ?? 30.0;

    if (start >= end) {
      setState(() {
        _statusText = 'Error: Start time must be less than end time.';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _statusText = 'Uploading & trimming audio track... (Please wait)';
    });

    try {
      final file = await api.trimAudio(_selectedFile!, start, end);
      setState(() {
        _isLoading = false;
        _statusText = 'Success! Trimmed audio saved to:\n${file.path}';
        _selectedFile = null;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _statusText = 'Trimming failed: ${e.toString().replaceAll('Exception:', '')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(AppTranslations.translate(context, 'trimmer_title')),
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
              onTap: _isLoading ? null : _pickAudioFile,
              child: Container(
                height: 200,
                decoration: BoxDecoration(
                  color: const Color(0xFF111827),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3), width: 2),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.audiotrack, size: 54, color: Color(0xFF10B981)),
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
              // Audio timing inputs
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _startController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: AppTranslations.translate(context, 'start_time'),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      controller: _endController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: AppTranslations.translate(context, 'end_time'),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              
              // Trim Button
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF10B981),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.content_cut, color: Colors.white),
                label: Text(AppTranslations.translate(context, 'trim_btn')),
                onPressed: _isLoading ? null : _trimAudio,
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
                child: CircularProgressIndicator(color: Color(0xFF10B981)),
              ),
              const SizedBox(height: 24),
            ],
          ],
        ),
      ),
    );
  }
}

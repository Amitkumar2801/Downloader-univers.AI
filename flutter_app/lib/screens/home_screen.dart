import 'package:flutter/material.dart';
import '../main.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isSettingsExpanded = false;

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = DownloaderApp.of(context)!;
    _urlController.text = state.backendUrl;

    return Scaffold(
      body: Stack(
        children: [
          // Background Glows
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF6366F1).withOpacity(0.15),
              ),
            ),
          ),
          Positioned(
            bottom: -150,
            right: -100,
            child: Container(
              width: 400,
              height: 400,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF97316).withOpacity(0.1),
              ),
            ),
          ),
          
          // Main Body
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Navbar Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFFF97316), Color(0xFFE11D48)],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.download, color: Colors.white, size: 24),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            AppTranslations.translate(context, 'app_title'),
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.settings, color: Colors.white70),
                            onPressed: () {
                              setState(() {
                                _isSettingsExpanded = !_isSettingsExpanded;
                              });
                            },
                          ),
                          const SizedBox(width: 8),
                          
                          // Language Dropdown Selector
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1F2937),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.white10),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: state.locale.languageCode,
                                dropdownColor: const Color(0xFF111827),
                                items: const [
                                  DropdownMenuItem(value: 'en', child: Text('🇺🇸 EN')),
                                  DropdownMenuItem(value: 'hi', child: Text('🇮🇳 HI')),
                                  DropdownMenuItem(value: 'ne', child: Text('🇳🇵 NE')),
                                  DropdownMenuItem(value: 'ur', child: Text('🇵🇰 UR')),
                                ],
                                onChanged: (value) {
                                  if (value != null) {
                                    state.changeLanguage(value);
                                  }
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  
                  // Settings Section
                  if (_isSettingsExpanded) ...[
                    const SizedBox(height: 16),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              AppTranslations.translate(context, 'settings'),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _urlController,
                              decoration: InputDecoration(
                                labelText: AppTranslations.translate(context, 'backend_url'),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF6366F1),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              onPressed: () {
                                state.updateBackendUrl(_urlController.text.trim());
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Settings saved successfully!')),
                                );
                                setState(() {
                                  _isSettingsExpanded = false;
                                });
                              },
                              child: Text(AppTranslations.translate(context, 'save')),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 32),

                  // Hero Text
                  Text(
                    AppTranslations.translate(context, 'hero_title'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    AppTranslations.translate(context, 'hero_subtitle'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 14, color: Colors.white60),
                  ),

                  const SizedBox(height: 40),

                  // Tool Cards
                  _buildToolCard(
                    context,
                    title: AppTranslations.translate(context, 'downloader_title'),
                    desc: AppTranslations.translate(context, 'downloader_desc'),
                    icon: Icons.link,
                    colors: [const Color(0xFFF97316), const Color(0xFFEA580C)],
                    route: '/downloader',
                  ),
                  const SizedBox(height: 20),
                  _buildToolCard(
                    context,
                    title: AppTranslations.translate(context, 'converter_title'),
                    desc: AppTranslations.translate(context, 'converter_desc'),
                    icon: Icons.music_note,
                    colors: [const Color(0xFF6366F1), const Color(0xFF4F46E5)],
                    route: '/converter',
                  ),
                  const SizedBox(height: 20),
                  _buildToolCard(
                    context,
                    title: AppTranslations.translate(context, 'trimmer_title'),
                    desc: AppTranslations.translate(context, 'trimmer_desc'),
                    icon: Icons.content_cut,
                    colors: [const Color(0xFF10B981), const Color(0xFF059669)],
                    route: '/trimmer',
                  ),

                  const SizedBox(height: 48),

                  // Supported Platforms section
                  Text(
                    AppTranslations.translate(context, 'supported_platforms'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildPlatformBadge('YouTube', Colors.red),
                      _buildPlatformBadge('Instagram', Colors.purple),
                      _buildPlatformBadge('Spotify', Colors.green),
                      _buildPlatformBadge('Twitter (X)', Colors.blue),
                      _buildPlatformBadge('Facebook', Colors.indigo),
                      _buildPlatformBadge('TikTok', Colors.cyan),
                      _buildPlatformBadge('SoundCloud', Colors.orange),
                      _buildPlatformBadge('Vimeo', Colors.lightBlue),
                      _buildPlatformBadge('Reddit', Colors.deepOrange),
                      _buildPlatformBadge('Pinterest', Colors.redAccent),
                      _buildPlatformBadge('DailyMotion', Colors.blueAccent),
                      _buildPlatformBadge('Bandcamp', Colors.teal),
                      _buildPlatformBadge('Mixcloud', Colors.blueGrey),
                      _buildPlatformBadge('TED Talks', Colors.red),
                      _buildPlatformBadge('Twitch', Colors.deepPurpleAccent),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolCard(
    BuildContext context, {
    required String title,
    required String desc,
    required IconData icon,
    required List<Color> colors,
    required String route,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: [
            colors[0].withOpacity(0.08),
            colors[1].withOpacity(0.03),
          ],
        ),
        border: Border.all(color: colors[0].withOpacity(0.2)),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => Navigator.pushNamed(context, route),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: colors),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: colors[0].withOpacity(0.4),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Icon(icon, color: Colors.white, size: 28),
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        desc,
                        style: const TextStyle(fontSize: 12, color: Colors.white54, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.white30),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlatformBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

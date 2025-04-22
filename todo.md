# Project Todo List

## API Key Management
- [✅] [T1] Implement session-based API key storage [Complexity: 7/10] [Priority: High] [Status: Complete]
  - Context: Transition from st.secrets to session storage for enhanced security
  - Acceptance criteria: 
    - API keys stored in session state
    - Keys expire after set duration
    - Backward compatibility maintained
  - Subtasks:
    - [✅] [T1.1] Create APIKeyManager utility class [Complexity: 3/10]
    - [✅] [T1.2] Update Config class to use session storage [Complexity: 4/10]
    - [✅] [T1.3] Update API keys management page [Complexity: 3/10]
    - [✅] [T1.4] Update OpenRouter client [Complexity: 2/10]

## Voice Generation
- [✅] [T2] Implement rate limiting for ElevenLabs API [Complexity: 6/10] [Priority: High] [Status: Complete]
  - Context: Prevent API abuse and ensure fair usage
  - Acceptance criteria:
    - Maximum 10 requests per minute
    - Minimum 0.5s between requests
    - Clear error messages for rate limits
  - Subtasks:
    - [✅] [T2.1] Add rate limiting logic [Complexity: 3/10]
    - [✅] [T2.2] Implement request tracking [Complexity: 2/10]
    - [✅] [T2.3] Add error handling [Complexity: 2/10]

- [✅] [T3] Enhance audio caching system [Complexity: 5/10] [Priority: Medium] [Status: Complete]
  - Context: Optimize API usage and improve performance
  - Acceptance criteria:
    - Cache audio based on text and voice
    - Clear cache management
    - Proper error handling
  - Dependencies: [T1]

- [✅] [T4] Add comprehensive tests for voice generation [Complexity: 4/10] [Priority: Medium] [Status: Complete]
  - Context: Ensure reliability of voice generation features
  - Acceptance criteria:
    - Test coverage for rate limiting
    - Test coverage for caching
    - Test coverage for error handling

## Future Enhancements
- [ ] [T5] Implement user authentication system [Complexity: 8/10] [Priority: Low] [Status: Pending]
  - Context: Prepare for potential SaaS transition
  - Acceptance criteria:
    - User registration and login
    - User-specific API key management
    - Session management
  - Dependencies: [T1]

- [ ] [T6] Add usage analytics [Complexity: 6/10] [Priority: Low] [Status: Pending]
  - Context: Track API usage patterns and optimize resources
  - Acceptance criteria:
    - Track API calls per user
    - Generate usage reports
    - Monitor rate limit hits
  - Dependencies: [T1, T2]

## Documentation
- [ ] [T7] Update documentation for API key management [Complexity: 3/10] [Priority: Medium] [Status: Pending]
  - Context: Ensure users understand new API key system
  - Acceptance criteria:
    - Document session-based storage
    - Explain key expiration
    - Update setup instructions
  - Dependencies: [T1] 
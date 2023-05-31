import React from 'react';
import { createRoot } from 'react-dom/client';

import a from '@/a.scss?modules';

class App extends React.Component {
  render() {
    console.warn(a);
    return (
      <div className={a.app}>
        <h1 className={a.title}>Hello World</h1>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(<App />);

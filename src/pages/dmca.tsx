import React from 'react';
import { GetStaticProps } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import LegalLayout from '../components/LegalLayout';

interface DMCAPageProps {
  contentHtml: string;
}

const DMCAPage: React.FC<DMCAPageProps> = ({ contentHtml }) => {
  return (
    <LegalLayout
      title="DMCA Copyright Policy"
      description="DMCA Copyright Policy for MemeMe - learn about our takedown procedures, fair use guidelines, and how to report copyright infringement."
    >
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </LegalLayout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const filePath = path.join(process.cwd(), 'src', 'content', 'legal', 'dmca.md');
  const fileContents = await fs.readFile(filePath, 'utf8');

  // Process markdown
  const processedContent = await remark().use(html).process(fileContents);
  const contentHtml = processedContent.toString();

  return {
    props: {
      contentHtml,
    },
  };
};

export default DMCAPage;